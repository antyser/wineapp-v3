#!/usr/bin/env python
"""
Script to run the wine assistant chat graph directly.

This script allows running the wine assistant graph from the command line
for testing and debugging purposes.

Usage:
    python -m src.ai.chat.run_graph               # Interactive mode
    python -m src.ai.chat.run_graph "What's a good wine for pasta?"  # Single query mode
    python -m src.ai.chat.run_graph --model gemini-2.5-pro-preview "What's the best Italian wine?"
    python -m src.ai.chat.run_graph --no-stream "What's a good wine for pasta?"  # Use invoke instead of stream
"""

import argparse
import asyncio
import os
import sys

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from loguru import logger

from src.ai.chat.config import GEMINI_2_5_FLASH_PREVIEW
from src.ai.chat.graph import graph

# Set up the logger
logger.remove()
logger.add(sys.stderr, level="INFO")


async def ainvoke_graph(user_input: str, model_name: str = GEMINI_2_5_FLASH_PREVIEW):
    """Invoke the graph for a given user input without streaming."""
    config = {
        "configurable": {
            "model": model_name,
        }
    }

    # Use messages to create a proper input format
    messages = [HumanMessage(content=user_input)]

    # Use invoke (non-streaming)
    print("\nProcessing your query...")
    result = await graph.ainvoke({"messages": messages}, config=config)

    # Print the raw result for debugging
    logger.debug(f"Raw result: {result}")

    if "messages" in result and result["messages"]:
        response_message = result["messages"][0]
        logger.debug(f"Response message: {response_message}")

        if hasattr(response_message, "content"):
            content = response_message.content
            print(f"\nAssistant: {content}\n")
        else:
            print("\nError: Response has no content\n")
    else:
        print("\nError: No messages in response\n")


async def stream_graph_updates(
    user_input: str, model_name: str = GEMINI_2_5_FLASH_PREVIEW
):
    """Stream updates from the graph for a given user input."""
    config = {
        "configurable": {
            "model": model_name,
        }
    }

    # Use messages to create a proper input format
    messages = [HumanMessage(content=user_input)]

    print("\nProcessing your query...")
    print("Assistant: ", end="", flush=True)

    # Track the accumulated content for display
    accumulated_content = ""

    try:
        # Stream the response
        async for event in graph.astream({"messages": messages}, config=config):
            if "messages" in event:
                # Get just the content from the last message
                message = event["messages"][-1]

                if hasattr(message, "content"):
                    # Only print the new part (what hasn't been printed yet)
                    new_content = message.content[len(accumulated_content) :]
                    if new_content:
                        print(new_content, end="", flush=True)
                        accumulated_content = message.content
                else:
                    logger.warning("Message has no content attribute")
    except Exception as e:
        logger.error(f"Error in streaming: {e}", exc_info=True)
        print(f"\nError: {e}")

    # Print a newline at the end of the response
    print("\n")


async def async_main():
    """Async main function to run the graph."""
    # Load environment variables from .env file
    load_dotenv()

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Run wine assistant chat graph")
    parser.add_argument(
        "query",
        nargs="?",  # Make it optional
        type=str,
        help="The question to ask the wine assistant (optional, enters interactive mode if not provided)",
    )
    parser.add_argument(
        "--model",
        "-m",
        type=str,
        default=GEMINI_2_5_FLASH_PREVIEW,
        help=f"Model to use (default: {GEMINI_2_5_FLASH_PREVIEW})",
    )
    parser.add_argument(
        "--api-key",
        "-k",
        type=str,
        help="Gemini API key (overrides environment variable)",
    )
    parser.add_argument(
        "--no-stream",
        action="store_true",
        help="Use invoke instead of streaming for responses",
    )
    parser.add_argument(
        "--debug",
        "-d",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    # Set debug logging if requested
    if args.debug:
        logger.remove()
        logger.add(sys.stderr, level="DEBUG")

    # Set API key from command line argument if provided
    if args.api_key:
        os.environ["GEMINI_API_KEY"] = args.api_key

    # Check for API key
    if not os.environ.get("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY environment variable must be set")
        print("Either:")
        print(
            "  1. Set it in your environment: export GEMINI_API_KEY=your_api_key_here"
        )
        print("  2. Add it to a .env file")
        print("  3. Pass it as a command line argument: --api-key YOUR_KEY")
        sys.exit(1)

    # If a query was provided, just answer that and exit
    if args.query:
        print(f"User query: {args.query}")
        try:
            if args.no_stream:
                await ainvoke_graph(args.query, args.model)
            else:
                await stream_graph_updates(args.query, args.model)
            return
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            print(f"Error: {e}")
            sys.exit(1)

    # Otherwise, enter interactive mode
    print("\nWine Assistant Chat")
    print("Type 'quit', 'exit', or 'q' to exit")
    if args.no_stream:
        print("Running in non-streaming mode (using invoke)\n")
    else:
        print("Running in streaming mode\n")

    # Main interaction loop
    while True:
        try:
            user_input = input("User: ")
            if user_input.lower() in ["quit", "exit", "q"]:
                print("Goodbye!")
                break

            if not user_input.strip():
                continue

            if args.no_stream:
                await ainvoke_graph(user_input, args.model)
            else:
                await stream_graph_updates(user_input, args.model)

        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"Error in interactive mode: {e}", exc_info=True)
            print(f"\nError: {e}")

            # Fallback option
            try:
                print("\nTrying fallback query...")
                fallback_input = "Tell me about Cabernet Sauvignon"
                print(f"User (fallback): {fallback_input}")

                if args.no_stream:
                    await ainvoke_graph(fallback_input, args.model)
                else:
                    await stream_graph_updates(fallback_input, args.model)
            except Exception as e2:
                logger.error(f"Fallback also failed: {e2}", exc_info=True)
                print(f"Fallback also failed: {e2}")


def main():
    """Run the async main function."""
    try:
        asyncio.run(async_main())
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
