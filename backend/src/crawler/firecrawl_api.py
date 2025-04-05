"""
Firecrawl API client for fetching web content.

This module provides functions to fetch web content using Firecrawl API.
https://docs.firecrawl.dev/introduction#crawling
"""

import asyncio
import os
from typing import Dict, List, Optional

import httpx
from dotenv import load_dotenv
from loguru import logger

# Load environment variables from .env file
load_dotenv()

# Load API key once at module import time
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
if FIRECRAWL_API_KEY:
    logger.info(f"Loaded Firecrawl API key: {FIRECRAWL_API_KEY[:5]}...")
else:
    logger.warning("FIRECRAWL_API_KEY environment variable is not set")


async def fetch_url(
    url: str, formats: List[str] = ["rawHtml", "screenshot"], timeout: int = 60
) -> Optional[Dict]:
    """
    Fetch content from a URL using Firecrawl API.

    Args:
        url: URL to fetch
        formats: List of formats to return (e.g., ["rawHtml", "screenshot"])
        timeout: Timeout in seconds

    Returns:
        Response data from Firecrawl API
    """
    # Get API key
    api_key = FIRECRAWL_API_KEY
    if not api_key:
        error_msg = "FIRECRAWL_API_KEY environment variable is not set"
        logger.error(error_msg)
        raise ValueError(error_msg)

    # Set up payload
    payload = {"url": url, "formats": formats}

    # Set up headers
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    # Fetch URL
    logger.info(f"Fetching URL with Firecrawl: {url}")
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://api.firecrawl.dev/v1/scrape",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            result = response.json()
            if result.get("success", False):
                logger.info(f"Successfully fetched URL: {url}")
                return result.get("data", {})
            else:
                logger.error(
                    f"Firecrawl API error: {result.get('error', 'Unknown error')}"
                )
                return None
    except httpx.HTTPStatusError as e:
        logger.error(
            f"HTTP error fetching URL {url}: {e.response.status_code} - {e.response.text}"
        )
        return None
    except Exception as e:
        logger.error(f"Error fetching URL {url}: {str(e)}")
        return None


async def batch_fetch_urls(
    urls: List[str], formats: List[str] = None, concurrency: int = 5
) -> List[Optional[Dict]]:
    """
    Fetch multiple URLs in parallel.

    Args:
        urls: List of URLs to fetch
        formats: List of formats to return (e.g., ["html", "markdown"])
        concurrency: Maximum number of concurrent requests

    Returns:
        List of responses from Firecrawl API
    """
    if not urls:
        return []

    # Use semaphore to limit concurrency
    semaphore = asyncio.Semaphore(concurrency)

    async def fetch_with_semaphore(url):
        async with semaphore:
            return await fetch_url(url, formats)

    # Fetch all URLs in parallel
    logger.info(f"Batch fetching {len(urls)} URLs with concurrency {concurrency}")
    tasks = [fetch_with_semaphore(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results, converting exceptions to None
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Error fetching URL {urls[i]}: {str(result)}")
            processed_results.append(None)
        else:
            processed_results.append(result)

    return processed_results



if __name__ == "__main__":
    asyncio.run(
        fetch_url(
            "https://www.wine-searcher.com/", formats=["rawHtml", "screenshot"]
        )
    )
