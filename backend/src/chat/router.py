"""Chat API endpoints for wine assistant."""

from asyncio.log import logger
from typing import Dict, List, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel, Field
from supabase import Client
from typing_extensions import Annotated

from src.ai.chat.config import GEMINI_2_5_FLASH_PREVIEW
from src.ai.chat.graph import graph as wine_agent_graph
from src.auth.utils import get_current_user

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


class ChatRequest(BaseModel):
    """Request body for chat API."""

    messages: List[Message] = Field(..., description="List of conversation messages")
    model: str = Field(
        default=GEMINI_2_5_FLASH_PREVIEW,
        description="Model to use for the chat",
    )
    stream: bool = Field(default=False, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Response for chat API."""

    response: MessageContent = Field(..., description="AI assistant response")
    followup_questions: List[str] = Field(
        default_factory=list, description="Generated follow-up questions"
    )


class FollowupQuestionsRequest(BaseModel):
    """Request body for follow-up questions API."""

    messages: List[Message] = Field(..., description="List of conversation messages")
    response: str = Field(..., description="The most recent assistant response")
    count: int = Field(
        default=3, description="Number of follow-up questions to generate"
    )
    model: str = Field(
        default=GEMINI_2_5_FLASH_PREVIEW,
        description="Model to use for generating questions",
    )


class FollowupQuestionsResponse(BaseModel):
    """Response for follow-up questions API."""

    questions: List[str] = Field(..., description="Generated follow-up questions")


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
    """Process messages through the LangGraph.

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
        result = await wine_agent_graph.ainvoke({"messages": messages}, config=config)
        logger.info(f"Raw result from graph: {result}")

        # Access the result content using the exact specified pattern
        response_content = result["messages"][-1].content
        logger.info(f"Response content: {response_content}")

        # Extract follow-up questions from XML tags if present
        clean_response = response_content
        followup_questions = []

        # Check if response contains followup questions in XML format
        if "<followup_questions>" in response_content:
            # Split the response at the followup_questions tag
            parts = response_content.split("<followup_questions>")
            if len(parts) > 1:
                # First part is the clean response
                clean_response = parts[0].strip()

                # Extract questions from the second part
                questions_part = parts[1].split("</followup_questions>")[0]

                # Extract individual questions from question tags
                import re

                question_matches = re.findall(
                    r"<question>(.*?)</question>", questions_part
                )
                followup_questions = [q.strip() for q in question_matches if q.strip()]

                logger.info(f"Extracted follow-up questions: {followup_questions}")

        return clean_response, followup_questions

    except Exception as e:
        logger.error(f"Error in process_with_graph: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


async def stream_chat_response(messages: List[BaseMessage], model_name: str):
    """Stream response chunks from the LangGraph.

    Args:
        messages: List of LangChain messages
        model_name: Name of the model to use

    Yields:
        SSE formatted response chunks
    """
    config = {
        "configurable": {
            "model": model_name,
        }
    }

    # Yield SSE format
    yield 'data: {"start":true}\n\n'

    # Variables to track complete response and follow-up questions
    complete_response = ""
    followup_questions = []
    response_ended = False

    try:
        # Use stream_mode="messages" to get token-by-token streaming
        async for chunk in wine_agent_graph.astream(
            {"messages": messages}, config=config, stream_mode="messages"
        ):
            # With messages streaming mode, we'll get message chunks
            if isinstance(chunk, tuple) and len(chunk) == 2:
                message_chunk, metadata = chunk

                # If there's content in the message chunk, send it
                if hasattr(message_chunk, "content") and message_chunk.content:
                    content = message_chunk.content
                    complete_response += content

                    # Check if we're getting to the followup_questions section
                    if (
                        "<followup_questions>" in complete_response
                        and not response_ended
                    ):
                        # Split at the tag to find where the main response ends
                        parts = complete_response.split("<followup_questions>")
                        if len(parts) > 1:
                            # We don't want to stream the XML tags
                            response_ended = True

                            # Send the last part of the response text
                            last_response_part = parts[0].strip()
                            yield f"data: {{\n"
                            yield f"data: \"content\": \"{last_response_part.replace('\"', '\\\"')}\"\n"
                            yield f"data: }}\n\n"
                            continue

                    # Don't stream content if we've reached the end of the main response
                    if not response_ended:
                        # Format as SSE data
                        yield f"data: {{\n"
                        yield f"data: \"content\": \"{content.replace('\"', '\\\"')}\"\n"
                        yield f"data: }}\n\n"
    except Exception as e:
        # Log the error
        logger.error(f"Error in streaming: {e}", exc_info=True)
        # Send error message
        yield f"data: {{\"error\": \"{str(e).replace('\"', '\\\"')}\"}}\n\n"

    # Extract follow-up questions from the complete response
    if "<followup_questions>" in complete_response:
        # Split the response at the followup_questions tag
        parts = complete_response.split("<followup_questions>")
        if len(parts) > 1:
            # Extract questions from the second part
            questions_part = parts[1].split("</followup_questions>")[0]

            # Extract individual questions from question tags
            import re

            question_matches = re.findall(r"<question>(.*?)</question>", questions_part)
            followup_questions = [q.strip() for q in question_matches if q.strip()]

            logger.info(
                f"Extracted follow-up questions from stream: {followup_questions}"
            )

    # Send follow-up questions in a separate event
    if followup_questions:
        import json

        questions_json = json.dumps(followup_questions)
        yield f'data: {{"followup_questions": {questions_json}}}\n\n'

    # Send end event
    yield 'data: {"done":true}\n\n'


@router.post("/wine", response_model=ChatResponse)
async def wine_chat(
    request: ChatRequest,
    current_user: Annotated[Dict, Depends(get_current_user)] = None,
) -> ChatResponse:
    """Process a wine chat request with conversation history.

    Args:
        request: Chat request with messages and model
        current_user: The authenticated user (optional)

    Returns:
        ChatResponse with the AI's response and follow-up questions
    """
    # Handle streaming requests differently
    if request.stream:
        return StreamingResponse(
            stream_chat_response(
                convert_to_langchain_messages(request.messages), request.model
            ),
            media_type="text/event-stream",
        )

    langchain_messages = convert_to_langchain_messages(request.messages)

    response_text, followup_questions = await process_with_graph(
        langchain_messages, request.model
    )
    logger.info(f"Response text: {response_text}")
    logger.info(f"Follow-up questions: {followup_questions}")

    return ChatResponse(
        response=MessageContent(text=response_text),
        followup_questions=followup_questions,
    )
