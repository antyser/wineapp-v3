"""Service functions for wine chat interactions."""

import json
import logging
import re
from typing import List, Tuple

from fastapi import HTTPException
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

from src.ai.chat.graph import graph as wine_agent_graph
from src.chat.schemas import Message

logger = logging.getLogger(__name__)

def convert_to_langchain_messages(messages: List[Message]) -> List[BaseMessage]:
    """Convert API message format to LangChain message objects.

    Args:
        messages: List of messages in API format

    Returns:
        List of LangChain BaseMessage objects
    """
    langchain_messages = []

    for message in messages:
        # Note: only using role types that are valid in the model (user or assistant)
        # If we get a 'system' role from the client, convert it to 'user' 
        if message.role == "user" or message.role == "system":
            langchain_messages.append(HumanMessage(content=message.content.text))
        elif message.role == "assistant":
            langchain_messages.append(AIMessage(content=message.content.text))

    return langchain_messages


async def process_with_graph(
    messages: List[BaseMessage], model_name: str
) -> Tuple[str, List[str]]:
    """Process messages through the LangGraph (non-streaming).

    Args:
        messages: List of LangChain messages
        model_name: Name of the model to use

    Returns:
        Tuple of (response_text, follow_up_questions)
    """
    logger.info(f"Processing messages with graph using model: {model_name}")
    logger.debug(f"Input messages: {messages}")

    config = {
        "configurable": {
            "model": model_name,
        }
    }

    try:
        # Use ainvoke for a single complete result
        result = await wine_agent_graph.ainvoke({"messages": messages}, config=config)
        logger.info(f"Raw result from graph: {result}")

        # Ensure the result is a dictionary and has the expected structure
        if not isinstance(result, dict) or "messages" not in result:
            logger.error(f"Unexpected graph result format: {result}")
            raise HTTPException(status_code=500, detail="Unexpected response format from AI agent.")

        final_message = result["messages"][-1]
        if not hasattr(final_message, 'content') or not isinstance(final_message.content, str):
            logger.error(f"Unexpected final message format: {final_message}")
            raise HTTPException(status_code=500, detail="Unexpected final message format from AI agent.")

        response_content = final_message.content
        logger.info(f"Response content: {response_content}")

        # Extract follow-up questions from XML tags if present
        clean_response = response_content
        followup_questions = []

        if "<followup_questions>" in response_content:
            parts = response_content.split("<followup_questions>", 1)
            clean_response = parts[0].strip()
            if len(parts) > 1 and "</followup_questions>" in parts[1]:
                questions_part = parts[1].split("</followup_questions>", 1)[0]
                question_matches = re.findall(r"<question>(.*?)</question>", questions_part)
                followup_questions = [q.strip() for q in question_matches if q.strip()]
                logger.info(f"Extracted follow-up questions: {followup_questions}")
            else:
                logger.warning("Found <followup_questions> tag but no closing tag or content.")
        else:
            logger.info("No follow-up questions found in the response.")

        return clean_response, followup_questions

    except Exception as e:
        logger.error(f"Error in process_with_graph: {e}", exc_info=True)
        # Re-raise or handle specific exceptions as needed
        # Avoid raising generic HTTPException if possible, let FastAPI handle standard errors
        raise  # Re-raise the original exception for FastAPI to handle


async def stream_chat_response(messages: List[BaseMessage], model_name: str):
    """Stream response chunks from the LangGraph using stream_mode='messages'.

    Args:
        messages: List of LangChain messages
        model_name: Name of the model to use

    Yields:
        Server-Sent Event (SSE) formatted response chunks as strings.
        Events: start, content, followup, error, end.
    """
    config = {
        "configurable": {
            "model": model_name,
        }
    }

    yield 'event: start\ndata: {}\n\n'
    logger.info("Stream started.")

    # Text accumulated from streamed tokens *before* the followup tag
    streamed_response_text_before_followups = ""
    # Keep track of the full final message content for followup extraction
    full_final_content = "" 
    followup_questions = []
    has_yielded_content = False
    stop_content_yield = False  # Flag to stop yielding content tokens

    try:
        logger.info("Starting graph astream loop with stream_mode='messages'...")
        # Explicitly set stream_mode to messages!
        async for message, metadata in wine_agent_graph.astream(
            {"messages": messages}, config=config, stream_mode="messages"
        ):
            logger.debug(f"Received stream message: {message}, metadata: {metadata}")

            if isinstance(message, AIMessage) and message.content:
                token = message.content
                if not token:
                    continue

                logger.debug(f"Received token: {token}")

                # Check if we should stop yielding content based on the flag
                if stop_content_yield:
                    # Still accumulate the full content for later extraction
                    full_final_content += token
                    continue  # Don't yield this token

                # Check if this token contains the start of the followup tag
                potential_full_response = streamed_response_text_before_followups + token
                if "<followup_questions>" in potential_full_response:
                    part_before_tag = token.split("<followup_questions>", 1)[0]
                    if part_before_tag:
                        logger.info(f"Yielding final content token(s) before tag: {part_before_tag}")
                        json_payload = json.dumps({"text": part_before_tag})
                        yield f'event: content\ndata: {json_payload}\n\n'
                        streamed_response_text_before_followups += part_before_tag
                        full_final_content += part_before_tag  # Add final part to full content too
                        has_yielded_content = True
                    logger.info("Follow-up tag detected in stream, stopping content yield but continuing accumulation.")
                    stop_content_yield = True # Stop yielding content tokens
                    # Accumulate the *entire current token* to full_final_content,
                    # as it might contain the start of the tag and part of the questions.
                    full_final_content += token
                else:
                    # Tag not found yet, yield the token and add to both texts
                    logger.info(f"Yielding content token: {token}")
                    json_payload = json.dumps({"text": token})
                    yield f'event: content\ndata: {json_payload}\n\n'
                    streamed_response_text_before_followups += token
                    full_final_content += token
                    has_yielded_content = True

        logger.info("Finished graph astream loop.")
        logger.info(f"Full final content accumulated from stream: {full_final_content[:200]}...") # Log accumulated content

        # --- Follow-up question extraction (from streamed content only) ---
        if "<followup_questions>" in full_final_content:
            parts = full_final_content.split("<followup_questions>", 1)
            # Ensure the closing tag is also present for reliable extraction
            if len(parts) > 1 and "</followup_questions>" in parts[1]:
                questions_part = parts[1].split("</followup_questions>", 1)[0]
                question_matches = re.findall(r"<question>(.*?)</question>", questions_part)
                followup_questions = [q.strip() for q in question_matches if q.strip()]
                logger.info(f"Extracted follow-up questions from streamed content: {followup_questions}")
            else:
                logger.warning("Found <followup_questions> tag in streamed content, but no closing tag or incomplete structure.")
        else:
            logger.info("No <followup_questions> tag found in the full streamed content.")


        # If no content was ever yielded (e.g., immediate error or empty response)
        if not has_yielded_content and not followup_questions: # also check if FUs were found, as they might be the only thing
            logger.warning("No content or follow-up questions were yielded during streaming.")

        # Send follow-up questions if any were extracted
        if followup_questions:
            logger.info(f"Yielding followup event: {followup_questions}")
            json_payload = json.dumps({"questions": followup_questions})
            yield f'event: followup\ndata: {json_payload}\n\n'

    except Exception as e:
        logger.error(f"Error during chat streaming: {e}", exc_info=True)
        error_payload = json.dumps({"error": str(e)})
        yield f'event: error\ndata: {error_payload}\n\n'
        logger.info("Yielded error event.")
    finally:
        yield 'event: end\ndata: {}\n\n'
        logger.info("Yielded end event. Stream finished.") 