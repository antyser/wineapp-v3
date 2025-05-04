"""Chat API endpoints for wine assistant."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from src.auth.utils import get_optional_user
from src.chat.schemas import (
    ChatRequest,
    ChatResponse,
    ChatStreamRequest,
    MessageContent,
)
from src.chat.service import (
    convert_to_langchain_messages,
    process_with_graph,
    stream_chat_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "/wine",
    response_model=ChatResponse,
    summary="Standard Wine Chat (Request/Response)",
    description="Process a wine chat request and return the complete response at once.",
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
    logger.info(
        f"Received standard chat request for user: {current_user_id or 'Anonymous'}"
    )
    logger.info(
        f"Request: messages count={len(request.messages)}, model={request.model}"
    )

    # Log the message roles for debugging
    for i, msg in enumerate(request.messages):
        logger.info(
            f"Message {i}: role={msg.role}, content_length={len(msg.content.text) if hasattr(msg.content, 'text') else 'N/A'}"
        )

    # Convert API message models to LangChain message models
    langchain_messages = convert_to_langchain_messages(request.messages)

    try:
        # Process the messages through the LangGraph
        response_text, followup_questions = await process_with_graph(
            langchain_messages, request.model
        )
        logger.info(f"Standard response text generated: {response_text[:100]}...")
        logger.info(f"Standard follow-up questions: {followup_questions}")

        # Return the response
        return ChatResponse(
            response=MessageContent(text=response_text),
            followup_questions=followup_questions,
        )
    except HTTPException as he:
        logger.error(
            f"HTTP exception in wine_chat_standard: {he.detail}, status_code: {he.status_code}"
        )
        raise he  # Re-raise HTTP exceptions directly
    except Exception as e:
        logger.error(f"Unhandled error in standard chat: {e}", exc_info=True)
        # Log the request body to help debug validation errors (422 errors)
        try:
            logger.error(
                f"Request data that caused error: messages count={len(request.messages)}, model={request.model}"
            )
            for i, msg in enumerate(request.messages):
                logger.error(
                    f"Message {i}: role={msg.role}, content_length={len(msg.content.text) if msg.content and hasattr(msg.content, 'text') else 'N/A'}"
                )
        except Exception as log_err:
            logger.error(f"Failed to log request details: {log_err}")

        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while processing the chat.",
        )


@router.post(
    "/wine/stream",
    summary="Streaming Wine Chat",
    description="Process a wine chat request and stream the response token by token using Server-Sent Events (SSE).",
    # No response_model here as it's a streaming response
)
async def wine_chat_stream(
    request: ChatStreamRequest,
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
    logger.info(
        f"Received streaming chat request for user: {current_user_id or 'Anonymous'}"
    )
    logger.info(
        f"Stream request: messages count={len(request.messages)}, model={request.model}"
    )

    # Log the message roles for debugging
    for i, msg in enumerate(request.messages):
        logger.info(
            f"Stream message {i}: role={msg.role}, content_length={len(msg.content.text) if hasattr(msg.content, 'text') else 'N/A'}"
        )

    # Convert API message models to LangChain message models
    langchain_messages = convert_to_langchain_messages(request.messages)

    # Return a streaming response
    return StreamingResponse(
        stream_chat_response(langchain_messages, request.model),
        media_type="text/event-stream",
    )
