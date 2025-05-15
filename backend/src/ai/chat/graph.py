"""Wine Assistant Agent Graph Definition."""

import os
from typing import Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph
from loguru import logger

from src.ai.chat.config import GEMINI_2_5_FLASH_PREVIEW, Configuration
from src.ai.chat.state import InputState, State

# Structured prompt for wine assistant
WINE_ASSISTANT_PROMPT = """
You are an expert sommelier and wine advisor assistant. Your role is to help users with any wine-related questions by searching for and providing accurate, helpful information

Use search when you need specific information about wines, vintages, regions, or technical aspects.
Provide balanced, informative responses that explain your reasoning rather than just listing facts.
If uncertain about specific details, use search to verify before providing information.
Always be respectful of different preferences and budgets in the wine world.

Return your responses in markdown format with appropriate headings and structure when helpful.
After your response, provide 3 concise follow-up questions that are relevant to the user's query.
The questions should always be related to wine. Each question should be less than 8 words. 
The questions should be placed in a xml tag called <followup_questions> and each question should be in a <question> tag.
"""


def create_llm(model_name: str = GEMINI_2_5_FLASH_PREVIEW):
    """
    Create a LangChain ChatGoogleGenerativeAI instance configured for wine assistant.

    Args:
        model_name: Name of the Gemini model to use.

    Returns:
        A ChatGoogleGenerativeAI instance.
    """
    return ChatGoogleGenerativeAI(
        model=model_name,
        temperature=0.7,
        top_p=0.95,
        google_api_key=os.environ.get("GEMINI_API_KEY"),
    )


def wine_assistant_node(
    state: State, config: RunnableConfig
) -> Dict[str, List[BaseMessage]]:
    """
    Node that generates a wine-related response using the LangChain Gemini integration.

    This node processes the full conversation history and generates a response
    based on all previous context.

    Args:
        state: The current state containing message history.
        config: Configuration for the runnable.

    Returns:
        A dictionary with the 'messages' field containing the updated message list.
    """
    configuration = Configuration.from_runnable_config(config)
    logger.debug(f"State received in wine_assistant_node: {state}")

    # Get the full conversation history
    message_history = state["messages"]

    # Extract the latest user message for logging
    last_message = message_history[-1]
    input_text = (
        last_message.content
        if hasattr(last_message, "content")
        else last_message.get("content", "")
    )

    logger.info(f"Latest user query: {input_text}")
    logger.debug(f"Conversation history length: {len(message_history)}")

    try:
        # Create the LLM with LangChain's Gemini integration
        llm = create_llm(configuration.model)

        # Prepare messages for the LLM
        prepared_messages = []

        # Add the system message with our wine assistant prompt first
        prepared_messages.append(HumanMessage(content=WINE_ASSISTANT_PROMPT))

        # Add all conversation history
        for msg in message_history:
            prepared_messages.append(msg)

        response = llm.invoke(prepared_messages)

        # Log the response for debugging
        logger.info(f"Generated response: {response}")

        if not response or not hasattr(response, "content") or not response.content:
            logger.error("Empty or invalid response received from LLM")
            return {
                "messages": [
                    AIMessage(
                        content="I apologize, but I couldn't generate a response. Please try again."
                    )
                ]
            }

        # Return the response message
        return {"messages": [response]}

    except Exception as e:
        logger.error(
            f"Error in wine_assistant_node: {e}", exc_info=True
        )  # Added exc_info=True to get full stack trace
        # Send an error message if something goes wrong
        return {
            "messages": [AIMessage(content=f"Sorry, I encountered an error: {str(e)}")]
        }


# Define the graph
builder = StateGraph(State, input=InputState, config_schema=Configuration)

# Add the streaming node
builder.add_node("generate", wine_assistant_node)

# Set the entry point
builder.add_edge("__start__", "generate")

# Set the end point
builder.add_edge("generate", "__end__")

# Compile the graph
graph = builder.compile()
graph.name = "Wine Assistant Agent"
