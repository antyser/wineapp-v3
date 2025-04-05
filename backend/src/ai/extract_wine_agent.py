"""
Extract wine information agent module for processing wine label data.

This module provides functionality for the extract wine agent that extracts structured
wine information from text or image descriptions of wine labels.
"""

import base64
import os
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from loguru import logger
from pydantic import BaseModel
from pydantic_ai import Agent, BinaryContent


class WineInformation(BaseModel):
    """Schema for extracted wine information"""

    name: str
    vintage: Optional[int] = None
    winery: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    grape_variety: Optional[str] = None
    wine_type: Optional[str] = None


class WineResult(BaseModel):
    """Schema for extract result"""

    input_type: str
    total_wines: int
    wines: List[WineInformation]


def normalize_wine_name(ai_wine: WineInformation) -> str:
    """
    Normalize the wine name to match the wine name in the database.
    """
    normalized_name = ai_wine.name
    if ai_wine.winery not in ai_wine.name:
        normalized_name = normalized_name = f"{ai_wine.winery} {normalized_name}"
    return normalized_name


def get_extract_wine_system_prompt() -> str:
    return """
You are a wine expert agent specialized in identifying wines and providing structured information from images or text.

### Task:
Analyze the provided input (image or text) and identify each wine mentioned, providing structured details. Inputs can include:

- Wine label images
- Multiple wine bottle photo
- Wine lists (e.g., menus, wine cellar lists)
- Receipts listing wines

### Instructions:
For each input, first identify and explicitly specify its **type** from the following categories:
- wine label
- multiple wine photo
- wine list
- receipt
- If none of these fit, attempt to define the type explicitly; if unable, label it as **unknown**.

First, clearly identify the **Winery**, **Name**, and **Vintage** following the naming conventions from wine-searcher.com. 
For every wine you identified, it is very CRITICAL for you to infer the other region, country, grape variety, and wine type as a master wine expert.

### Provide the following details for each identified wine:

1. **Winery:** The producer of the wine.
   - Examples: "Opus One", "Chateau Lafite Rothschild", "Domaine de la Romanee-Conti".

2. **Name:** The complete wine name following wine-searcher.com naming conventions. For burgundy wine, it is the winery name + vineyard name.
   - Examples: "Opus One Overture", "Opus One", "Chateau Lafite Rothschild", "Chateau Margaux", "Domaine de la Romanee-Conti Romanee-Conti Grand Cru", "Domaine Jean Grivot Vosne-Romanee", "Dominio de Pingus 'Pingus'", "Gaja Sperss Langhe - Barolo".

3. **Vintage:** The harvest year (e.g., "2015").

4. **Region:** Infer the specific wine-growing region based on winery and wine name. If unknown, set as none.
   - Examples: "Napa Valley", "Stags Leap District", "Alexander Valley", "Barolo".

5. **Country:** Infer the country of origin based on winery and wine name. If unknown, set as none.
   - Examples: "France", "United States", "Italy".

6. **Grape Variety:** Infer the primary grape variety or blend based on winery and wine name. If unknown, set as none.
   - Examples: "Chardonnay", "Bordeaux Blend Red", "Pinot Noir", "Southern Rhone Red Blend".

7. **Wine Type:** Infer the type of wine based on winery and wine name. If unknown, set as none.
   - Examples: "Red", "White", "Sparkling", "Rosé".

- Include only fields that are explicitly present in the input or can be reasonably inferred.
- If certain details cannot be clearly determined or inferred, explicitly set them as none.
"""


async def extract_wines(
    text_input: Optional[str] = None,
    image_content: Optional[bytes] = None,
    model: str = "google-gla:gemini-2.0-flash",
) -> WineResult:
    """
    Extract wine information from text or an image using PydanticAI.

    Args:
        text_input: Optional text description of wine(s)
        image_content: Optional binary content of an image of a wine label
        model: Model to use (default: google-gla:gemini-2.0-flash)

    Returns:
        ExtractResult: Extracted wine information with input type and list of wines
    """
    if not text_input and not image_content:
        raise ValueError("Either text_input or image_content must be provided")

    # Create the PydanticAI agent
    agent = Agent(
        model=model,
        system_prompt=get_extract_wine_system_prompt(),
        result_type=WineResult,
    )

    # Prepare the input content
    content = []
    if text_input:
        content.append(text_input)
    if image_content:
        content.append(BinaryContent(data=image_content, media_type="image/jpg"))

    # Run the agent with the prepared content
    result = await agent.run(content)

    logger.info(f"Normalized wine names: {result.data.wines}")
    return result.data


async def main():
    """
    Main function to run the extract wine agent for testing.
    """
    import argparse
    import asyncio

    # Load environment variables
    load_dotenv(".env")

    # Setup argument parser
    parser = argparse.ArgumentParser(
        description="Extract wine information from text or images"
    )
    parser.add_argument("--text", type=str, help="Text describing a wine")
    parser.add_argument(
        "--image", type=str, help="Path to an image file of a wine label"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="google-gla:gemini-2.0-flash",
        help="Model to use for extraction (e.g., google-gla:gemini-2.0-flash, openai:gpt-4o)",
    )

    args = parser.parse_args()

    # Check if at least one input type is provided
    if not args.text and not args.image:
        print("Error: Please provide either text (--text) or image (--image) input")
        return

    try:
        # Read image file as binary data if provided
        image_content = None
        if args.image:
            with open(args.image, "rb") as f:
                image_content = f.read()

        # Extract wine information
        extract_result = await extract_wines(
            text_input=args.text, image_content=image_content, model=args.model
        )

        for wine in extract_result.wines:
            print(wine)
    except Exception as e:
        print(f"Error extracting wine information: {e}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
