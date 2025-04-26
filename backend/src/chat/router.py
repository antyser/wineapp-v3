"""Chat API endpoints for wine assistant."""

from asyncio.log import logger
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel, Field
from supabase import Client
from typing_extensions import Annotated

from src.ai.chat.config import GEMINI_2_5_FLASH_PREVIEW
from src.ai.chat.graph import graph as wine_agent_graph
from src.auth.utils import get_current_user, get_optional_user

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageContent(BaseModel):
    """Content of a chat message."""

    text: str = Field(..., description="The text content of the message")


class Message(BaseModel):
    """Chat message model."""

    role: Literal["user", "assistant"] = Field(
        ..., description="Role of the message sender"
    )
    content: MessageContent = Field(..., description="Content of the message")


# Request model for non-streaming chat
class ChatRequest(BaseModel):
    """Request body for the standard (non-streaming) chat API."""

    messages: List[Message] = Field(..., description="List of conversation messages")
    model: str = Field(
        default=GEMINI_2_5_FLASH_PREVIEW,
        description="Model to use for the chat",
    )
    # stream: bool = Field(default=False, description="Whether to stream the response") # Removed stream field

# Request model specifically for the streaming endpoint
class ChatStreamRequest(BaseModel):
    """Request body for the streaming chat API."""
    messages: List[Message] = Field(..., description="List of conversation messages")
    model: str = Field(
        default=GEMINI_2_5_FLASH_PREVIEW,
        description="Model to use for the chat",
    )

class ChatResponse(BaseModel):
    """Response for the standard (non-streaming) chat API."""

    response: MessageContent = Field(..., description="AI assistant response")
    followup_questions: List[str] = Field(
        default_factory=list, description="Generated follow-up questions"
    )


# Removed FollowupQuestionsRequest and Response as they seem unused currently


def convert_to_langchain_messages(messages: List[Message]) -> List[BaseMessage]:
    """Convert API message format to LangChain message objects.

    Args:
        messages: List of messages in API format

    Returns:
        List of LangChain BaseMessage objects
    """
    langchain_messages = []

    for message in messages:
        if message.role == "user":
            langchain_messages.append(HumanMessage(content=message.content.text))
        elif message.role == "assistant":
            langchain_messages.append(AIMessage(content=message.content.text))

    return langchain_messages


async def process_with_graph(
    messages: List[BaseMessage], model_name: str
) -> tuple[str, List[str]]:
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
                import re
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
        raise # Re-raise the original exception for FastAPI to handle


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
    stop_content_yield = False # Flag to stop yielding content tokens

    try:
        logger.info("Starting graph astream loop with stream_mode='messages'...")
        # Explicitly set stream_mode to messages!
        async for chunk_info in wine_agent_graph.astream(
            {"messages": messages}, config=config, stream_mode="messages"
        ):
            logger.debug(f"Received stream chunk_info TYPE: {type(chunk_info)}, CONTENT: {chunk_info}")

            if isinstance(chunk_info, tuple) and len(chunk_info) == 2:
                message_chunk, metadata = chunk_info

                if isinstance(message_chunk, AIMessage) and message_chunk.content:
                    token = message_chunk.content
                    if not token: 
                        continue
                        
                    logger.debug(f"Received token: {token}")

                    # Check if we should stop yielding content based on the flag
                    if stop_content_yield:
                        # Still accumulate the full content for later extraction
                        full_final_content += token
                        continue # Don't yield this token

                    # Check if this token contains the start of the followup tag
                    potential_full_response = streamed_response_text_before_followups + token
                    if "<followup_questions>" in potential_full_response:
                        part_before_tag = token.split("<followup_questions>", 1)[0]
                        if part_before_tag:
                             logger.info(f"Yielding final content token(s) before tag: {part_before_tag}")
                             import json
                             json_payload = json.dumps({"text": part_before_tag})
                             yield f'event: content\ndata: {json_payload}\n\n'
                             streamed_response_text_before_followups += part_before_tag
                             full_final_content += part_before_tag # Add final part to full content too
                             has_yielded_content = True
                        logger.info("Follow-up tag detected in stream, stopping content yield.")
                        stop_content_yield = True
                        # Accumulate the rest of the token (containing the tag start) for full content
                        full_final_content += token 
                        # Don't break the loop, just stop yielding content
                    else:
                         # Tag not found yet, yield the token and add to both texts
                         logger.info(f"Yielding content token: {token}")
                         import json
                         json_payload = json.dumps({"text": token})
                         yield f'event: content\ndata: {json_payload}\n\n'
                         streamed_response_text_before_followups += token
                         full_final_content += token
                         has_yielded_content = True
            # ... (handle other chunk types if needed)

        logger.info("Finished graph astream loop.")

        # --- Follow-up question extraction (Reliable Method) --- 
        # Re-invoke the graph non-streamingly to get the guaranteed final state
        logger.info("Invoking graph non-streamingly to get final state for followup extraction...")
        final_state = await wine_agent_graph.ainvoke({"messages": messages}, config=config)
        if isinstance(final_state, dict) and "messages" in final_state and final_state["messages"]:
            final_message_content = final_state["messages"][-1].content
            logger.info(f"Full final message content: {final_message_content[:200]}...")
            if isinstance(final_message_content, str) and "<followup_questions>" in final_message_content:
                parts = final_message_content.split("<followup_questions>", 1)
                if len(parts) > 1 and "</followup_questions>" in parts[1]:
                    questions_part = parts[1].split("</followup_questions>", 1)[0]
                    import re
                    question_matches = re.findall(r"<question>(.*?)</question>", questions_part)
                    followup_questions = [q.strip() for q in question_matches if q.strip()]
                    logger.info(f"Extracted follow-up questions reliably: {followup_questions}")
                else:
                    logger.warning("Found followup tag in final message, but structure incomplete.")
            else:
                logger.info("No followup tag found in final message content.")
        else:
            logger.warning("Could not get final state or messages from non-streaming invoke.")
            # Fallback to using `full_final_content` accumulated during stream (less reliable)
            logger.info(f"Falling back to followup extraction from streamed text: {full_final_content[:100]}...")
            if "<followup_questions>" in full_final_content:
                parts = full_final_content.split("<followup_questions>", 1)
                # ... (rest of fallback extraction logic as before) ...
                if len(parts) > 1 and "</followup_questions>" in parts[1]:
                    questions_part = parts[1].split("</followup_questions>", 1)[0]
                    import re
                    question_matches = re.findall(r"<question>(.*?)</question>", questions_part)
                    fallback_questions = [q.strip() for q in question_matches if q.strip()]
                    if not followup_questions: # Only use fallback if primary failed
                         followup_questions = fallback_questions
                         logger.info(f"Using fallback extracted questions: {followup_questions}")

        # If no content was ever yielded (e.g., immediate error or empty response)
        if not has_yielded_content:
             logger.warning("No content was yielded during streaming.")

        # Send follow-up questions if any were extracted
        if followup_questions:
            logger.info(f"Yielding followup event: {followup_questions}")
            import json
            json_payload = json.dumps({"questions": followup_questions})
            yield f'event: followup\ndata: {json_payload}\n\n'

    except Exception as e:
        logger.error(f"Error during chat streaming: {e}", exc_info=True)
        import json
        error_payload = json.dumps({"error": str(e)})
        yield f'event: error\ndata: {error_payload}\n\n'
        logger.info("Yielded error event.")
    finally:
        yield 'event: end\ndata: {}\n\n'
        logger.info("Yielded end event. Stream finished.")


@router.post(
    "/wine",
    response_model=ChatResponse,
    summary="Standard Wine Chat (Request/Response)",
    description="Process a wine chat request and return the complete response at once."
)
async def wine_chat_standard(
    request: ChatRequest,
    # Using get_optional_user as authentication might not be strictly required for chat
    current_user_id: Optional[str] = Depends(get_optional_user),
) -> ChatResponse:
    """Processes a wine chat request, returning a single complete response.

    Args:
        request: Chat request with messages and model.
        current_user_id: UUID of the authenticated user (optional).

    Returns:
        ChatResponse containing the full AI response and any follow-up questions.
    """
    logger.info(f"Received standard chat request for user: {current_user_id or 'Anonymous'}")
    langchain_messages = convert_to_langchain_messages(request.messages)

    try:
        response_text, followup_questions = await process_with_graph(
            langchain_messages, request.model
        )
        logger.info(f"Standard response text generated: {response_text[:100]}...")
        logger.info(f"Standard follow-up questions: {followup_questions}")

        return ChatResponse(
            response=MessageContent(text=response_text),
            followup_questions=followup_questions,
        )
    except HTTPException as he:
         raise he # Re-raise HTTP exceptions directly
    except Exception as e:
        logger.error(f"Unhandled error in standard chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while processing the chat.")


@router.post(
    "/wine/stream",
    summary="Streaming Wine Chat",
    description="Process a wine chat request and stream the response token by token using Server-Sent Events (SSE).",
    # No response_model here as it's a streaming response
)
async def wine_chat_stream(
    request: ChatStreamRequest, # Use the specific request model
    # Using get_optional_user as authentication might not be strictly required for chat
    current_user_id: Optional[str] = Depends(get_optional_user),
) -> StreamingResponse:
    """Processes a wine chat request and streams the response.

    Args:
        request: Chat request with messages and model.
        current_user_id: UUID of the authenticated user (optional).

    Returns:
        A StreamingResponse using text/event-stream media type.
    """
    logger.info(f"Received streaming chat request for user: {current_user_id or 'Anonymous'}")
    langchain_messages = convert_to_langchain_messages(request.messages)

    return StreamingResponse(
        stream_chat_response(langchain_messages, request.model),
        media_type="text/event-stream",
    )
