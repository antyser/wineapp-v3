import base64
import os
import re
import time
from typing import Any, Dict, Optional, Union

import xmltodict
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.types import Candidate
from loguru import logger
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# Initialize the client once at module level
load_dotenv(".env")
_gemini_client = None


def _get_gemini_client():
    """Get or initialize the Gemini client."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY"),
        )
    return _gemini_client


class GeminiError(Exception):
    """Base class for Gemini API errors."""

    pass


class GeminiRecitationError(GeminiError):
    """Error when Gemini returns a RECITATION finish reason."""

    pass


class GeminiEmptyResponseError(GeminiError):
    """Error when Gemini returns an empty or invalid response."""

    pass

PROMPT = """You are a wine expert AI assistant. Your task is to research and provide comprehensive information for a specific wine and vintage using search tools.

**Instructions:**

1.  **Identify the Wine:** Use the details provided below (Name, Vintage, Winery if available) to pinpoint the exact wine.
2.  **Research Step-by-Step:** Use your search capabilities to find the information for each field listed below.
3.  **Prioritize Vintage Specificity:** Ensure ALL information (especially tasting notes, drinking window, ABV) corresponds *specifically* to the requested vintage. If vintage-specific data isn't available for a field, note that or find the most relevant general information, clearly stating it's not vintage-specific.
4.  **Format Output:** Present the final information enclosed within a single `<wine_info>` root XML tag. Each piece of data should be wrapped in its corresponding XML tag as specified below. If a piece of information for an optional field cannot be found, omit the tag entirely.

**Information Fields to Find (and their XML tags):**

*   `<name>`: The full name of the wine. (str)
*   `<winery>`: The name of the winery/producer. (Optional[str])
*   `<vintage>`: The specific vintage year. (Optional[int])
*   `<region>`: The wine region (e.g., Napa Valley, Bordeaux). (Optional[str])
*   `<country>`: The country of origin. (Optional[str])
*   `<varietal>`: The grape varietal(s) (e.g., Cabernet Sauvignon, Chardonnay, Blend details if available). (Optional[str])
*   `<type>`: The type of wine (e.g., Red, White, Sparkling, Rosé, Fortified). (Optional[str])
*   `<price>`: A representative current or retail price found. Specify currency if possible. (Optional[float])
*   `<average_price>`: The average price, often found on sites like Wine-Searcher. Specify currency if possible. (Optional[float])
*   `<abv>`: Alcohol by Volume, usually expressed as a percentage. (Optional[str])
*   `<drinking_window>`: The recommended period for consumption, formatted as YYYY-YYYY. (Optional[str])
*   `<description>`: A general description or summary of the wine. (Optional[str])
*   `<tasting_notes>`: Detailed notes on the wine's aroma, palate, and finish. (Optional[str])
*   `<food_pairings>`: Suggested food pairings for the wine. (Optional[str])
*   `<wine_searcher_url>`: Link to the wine's page on Wine-Searcher.com, if available. (Optional[str])
*   `<wine_searcher_id>`: The ID used by Wine-Searcher for this specific wine/vintage. (Optional[str])

**IMPORTANT**: Do not copy text verbatim from sources. Synthesize and paraphrase information in your own words.

**Wine to Research:**
"""

PROMPT_2 = """You are a wine expert AI assistant. Your task is to research and provide comprehensive information for a specific wine and vintage using search tools.

**Instructions:**

1.  **Identify the Wine:** Use the details provided below (Name, Vintage, Winery if available) to pinpoint the exact wine.
2.  **Research Step-by-Step:** Use your search capabilities to find the information for each field listed below.
3.  **Prioritize Vintage Specificity:** Ensure ALL information (especially tasting notes, drinking window, ABV) corresponds *specifically* to the requested vintage. If vintage-specific data isn't available for a field, note that or find the most relevant general information, clearly stating it's not vintage-specific.
4.  **Format Output:** Present the final information enclosed within a single `<wine_info>` root XML tag. Each piece of data should be wrapped in its corresponding XML tag as specified below. If a piece of information for an optional field cannot be found, omit the tag entirely.

**Information Fields to Find (and their XML tags):**

*   `<name>`: The full name of the wine. (str)
*   `<winery>`: The name of the winery/producer. (Optional[str])
*   `<vintage>`: The specific vintage year. (Optional[int])
*   `<region>`: The wine region (e.g., Napa Valley, Bordeaux). (Optional[str])
*   `<country>`: The country of origin. (Optional[str])
*   `<varietal>`: The grape varietal(s) (e.g., Cabernet Sauvignon, Chardonnay, Blend details if available). (Optional[str])
*   `<type>`: The type of wine (e.g., Red, White, Sparkling, Rosé, Fortified). (Optional[str])
*   `<abv>`: Alcohol by Volume, usually expressed as a percentage. (Optional[str])
*   `<drinking_window>`: The recommended period for consumption, formatted as YYYY-YYYY. (Optional[str])
*   `<description>`: A general description or summary of the wine. (Optional[str])
*   `<tasting_notes>`: Detailed notes on the wine's aroma, palate, and finish. (Optional[str])
*   `<winemaker_notes>`: Specific notes or comments from the winemaker about this vintage. (Optional[str])
*   `<professional_reviews>`: Include professional critic reviews. If found, structure as:
    *   `<professional_critic>`: Container for a single critic review
        *   `<critic_name>`: Name of the critic or publication.
        *   `<critic_rating>`: Rating given by the critic.
        *   `<critic_review>`: The text of the review.
    *   *(Include multiple `<professional_critic>` blocks if multiple reviews are found)*
*   `<food_pairings>`: Suggested food pairings for the wine. (Optional[str])
*   `<wine_searcher_url>`: Link to the wine's page on Wine-Searcher.com, if available. (Optional[str])
*   `<wine_searcher_id>`: The ID used by Wine-Searcher for this specific wine/vintage. (Optional[str])

**IMPORTANT**: Do not copy text verbatim from sources. Synthesize and paraphrase information in your own words.

**Wine to Research:**
"""


@retry(
    retry=retry_if_exception_type((GeminiRecitationError, GeminiEmptyResponseError)),
    stop=stop_after_attempt(3),
    reraise=True,
)
def generate(query: str):
    """
    Generate wine details using Gemini API with retry logic for recitation errors.

    Args:
        query: The wine query string

    Returns:
        The response from Gemini

    Raises:
        GeminiRecitationError: When the model response is flagged as recitation
        GeminiEmptyResponseError: When the model response is empty or invalid
        Exception: For other errors during generation
    """
    client = _get_gemini_client()
    model = "gemini-2.0-flash"
    # model = "gemini-2.5-pro-exp-03-25"

    system_instruction = PROMPT

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=query),
            ],
        ),
    ]

    tools = [types.Tool(google_search=types.GoogleSearch())]
    generate_content_config = types.GenerateContentConfig(
        tools=tools,
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text=system_instruction + query),
        ],
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )

        # Check for recitation error
        if (
            hasattr(response, "candidates")
            and response.candidates
            and hasattr(response.candidates[0], "finish_reason")
            and response.candidates[0].finish_reason
            and response.candidates[0].finish_reason == "RECITATION"
        ):

            logger.warning(
                f"Gemini returned RECITATION error, retrying with backoff..."
            )
            raise GeminiRecitationError("Model response flagged as recitation")

        # Check for empty response
        if (
            not response
            or not response.candidates
            or not response.candidates[0].content
            or not response.candidates[0].content.parts
        ):

            logger.warning(f"Gemini returned empty response, retrying with backoff...")
            raise GeminiEmptyResponseError("Empty or invalid response from Gemini")

        logger.info(f"Successfully generated response from Gemini")
        return response

    except Exception as e:
        if not isinstance(e, (GeminiRecitationError, GeminiEmptyResponseError)):
            logger.error(f"Error generating content from Gemini: {str(e)}")
            raise
        raise


def extract_xml_from_response(response) -> Optional[str]:
    """
    Extract XML content from Gemini response.

    Args:
        response: The response from Gemini

    Returns:
        Optional[str]: The XML content as a string or None if not found
    """
    if (
        not response
        or not response.candidates
        or not response.candidates[0].content.parts
    ):
        logger.error("Empty or invalid response from Gemini")
        return None

    text = response.candidates[0].content.parts[0].text
    if not text:
        logger.error("No text content in Gemini response")
        return None

    # Extract content between <wine_info> tags
    match = re.search(r"<wine_info>(.*?)</wine_info>", text, re.DOTALL)
    if match:
        return f"<wine_info>{match.group(1)}</wine_info>"

    # If no wine_info tags, try to find any XML-like content
    match = re.search(r"<([a-zA-Z0-9_]+)>.*?</\1>", text, re.DOTALL)
    if match:
        # Find the outermost XML tag
        tag_name = match.group(1)
        full_xml = re.search(f"<{tag_name}>.*?</{tag_name}>", text, re.DOTALL)
        if full_xml:
            return full_xml.group(0)

    logger.warning("No XML content found in response")
    return None


def convert_to_numeric(value: Any, field_type: str) -> Union[int, float, None]:
    """Helper function to convert string values to numeric types.

    Args:
        value: The value to convert
        field_type: The type to convert to ('int' or 'float')

    Returns:
        The converted numeric value or None if conversion fails
    """
    if value is None:
        return None

    try:
        if field_type == "int":
            try:
                return int(value)
            except ValueError:
                # Try as float first, then convert to int if possible
                float_val = float(value)
                if float_val.is_integer():
                    return int(float_val)
                return float_val
        elif field_type == "float":
            # Extract just the number if there's a currency symbol
            if isinstance(value, str):
                value = re.sub(r"[^\d.]", "", value)
            return float(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Could not convert value '{value}' to {field_type}: {e}")
        return None

    return None


def parse_xml_to_wine(xml_content: str) -> Optional[Any]:
    """
    Parse XML content to a WineCreate object using xmltodict.

    Args:
        xml_content: XML string containing wine information

    Returns:
        Optional[WineCreate]: A WineCreate object or None if parsing fails
    """
    # Import here to avoid circular import
    from src.wines.schemas import WineCreate

    try:
        # Parse XML to dict
        xml_dict = xmltodict.parse(xml_content)

        # Get the root element (should be 'wine_info')
        root_key = list(xml_dict.keys())[0]
        wine_data_dict = xml_dict[root_key]

        # Initialize wine data with defaults
        wine_data = {}

        # Map XML tags to Wine model fields
        xml_to_wine_field_map = {
            "name": "name",
            "winery": "winery",
            "vintage": "vintage",
            "region": "region",
            "country": "country",
            "varietal": "varietal",
            "type": "type",
            "price": "price",
            "average_price": "average_price",
            "rating": "rating",
            "abv": "abv",
            "drinking_window": "drinking_window",
            "description": "description",
            "tasting_notes": "tasting_notes",
            "winemaker_notes": "winemaker_notes",
            "food_pairings": "food_pairings",
            "wine_searcher_url": "wine_searcher_url",
            "wine_searcher_id": "wine_searcher_id",
        }

        # Extract all fields from XML dict
        for tag, field in xml_to_wine_field_map.items():
            if tag in wine_data_dict and wine_data_dict[tag]:
                value = wine_data_dict[tag]

                # Convert numeric fields
                if field in ["vintage", "rating"]:
                    numeric_value = convert_to_numeric(value, "int")
                    if numeric_value is not None:
                        wine_data[field] = numeric_value
                elif field in ["price", "average_price"]:
                    numeric_value = convert_to_numeric(value, "float")
                    if numeric_value is not None:
                        wine_data[field] = numeric_value
                else:
                    wine_data[field] = (
                        value.strip() if isinstance(value, str) else value
                    )

        # Handle professional reviews if present
        if "professional_reviews" in wine_data_dict:
            reviews = []
            prof_reviews = wine_data_dict["professional_reviews"]

            # Handle different structures from xmltodict
            if isinstance(prof_reviews, dict) and "professional_critic" in prof_reviews:
                critics = prof_reviews["professional_critic"]

                # Handle single critic or list of critics
                if not isinstance(critics, list):
                    critics = [critics]

                for critic in critics:
                    critic_name = critic.get("critic_name", "")
                    critic_rating = critic.get("critic_rating", "")
                    critic_review = critic.get("critic_review", "")

                    if critic_name:
                        review_text = f"{critic_name}"
                        if critic_rating:
                            review_text += f": {critic_rating}"
                        if critic_review:
                            review_text += f" - {critic_review}"

                        reviews.append(review_text)

            if reviews:
                wine_data["professional_reviews"] = "\n\n".join(reviews)

        try:
            return WineCreate(**wine_data)
        except Exception as validation_error:
            logger.error(
                f"Validation error creating WineCreate object: {validation_error}"
            )
            # Check for name since it's required
            if "name" not in wine_data:
                logger.error("Required field 'name' not found in wine XML data")
            return None

    except xmltodict.expat.ExpatError as e:
        logger.error(f"XML parsing error: {e}")
        return None
    except Exception as e:
        logger.error(f"Error parsing wine XML data: {e}")
        return None


async def get_wine_details(query: str) -> Optional[Any]:
    """
    Generate wine details using Gemini and parse the response to WineCreate object.

    Args:
        query: The wine query string

    Returns:
        Optional[WineCreate]: A WineCreate object or None if generation or parsing fails
    """
    try:
        # Generate wine details
        response = generate(query)

        # Extract XML from response
        xml_content = extract_xml_from_response(response)
        if not xml_content:
            logger.error("Failed to extract XML content from Gemini response")
            return None

        # Parse XML to Wine object
        wine = parse_xml_to_wine(xml_content)
        if not wine:
            logger.error("Failed to parse XML content to WineCreate object")
            return None

        return wine

    except GeminiRecitationError:
        logger.error(
            "Failed to generate wine details due to recitation issues after retries"
        )
        return None
    except GeminiEmptyResponseError:
        logger.error(
            "Failed to generate wine details due to empty responses after retries"
        )
        return None
    except Exception as e:
        logger.error(f"Error getting wine details: {e}")
        return None


if __name__ == "__main__":
    import asyncio

    result = asyncio.run(
        get_wine_details(
            """
    opus one 2010
    """
        )
    )
    print(result)
