"""Pydantic schemas for chat API."""

from typing import List, Literal
from pydantic import BaseModel, Field

from src.ai.chat.config import GEMINI_2_5_FLASH_PREVIEW


class MessageContent(BaseModel):
    """Content of a chat message."""

    text: str = Field(..., description="The text content of the message")


class Message(BaseModel):
    """Chat message model."""

    role: Literal["user", "assistant", "system"] = Field(
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