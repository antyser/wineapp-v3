"""Tests for the wine chat assistant."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage

from src.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    return {"id": "test_user_id", "email": "test@example.com"}


@pytest.fixture
def mock_supabase_client():
    return AsyncMock()


@patch("src.chat.router.get_current_user")
@patch("src.chat.router.get_supabase_client")
@patch("src.ai.chat.wine_agent.graph.astream")
def test_wine_chat_stream(
    mock_astream,
    mock_get_supabase,
    mock_get_user,
    client,
    mock_current_user,
    mock_supabase_client,
):
    # Setup mocks
    mock_get_user.return_value = mock_current_user
    mock_get_supabase.return_value = mock_supabase_client

    # Mock the streaming response from the graph
    mock_response = {
        "messages": [
            AIMessage(content="Here's information about Cabernet Sauvignon...")
        ],
        "stream": True,
    }
    mock_astream.return_value = AsyncMock(
        __aiter__=lambda _: AsyncMock(
            __anext__=AsyncMock(side_effect=[mock_response, StopAsyncIteration()])
        )
    )

    # Make the request
    response = client.post(
        "/api/v1/chat/wine/stream", json={"message": "Tell me about Cabernet Sauvignon"}
    )

    # Check the response
    assert response.status_code == 200
    assert mock_astream.called

    # Verify that the correct parameters were passed to the graph
    call_args = mock_astream.call_args[0][0]
    assert "messages" in call_args
    assert isinstance(call_args["messages"][0], HumanMessage)
    assert call_args["messages"][0].content == "Tell me about Cabernet Sauvignon"
