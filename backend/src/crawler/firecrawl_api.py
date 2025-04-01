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
    url: str, formats: List[str] = None, timeout: int = 60
) -> Optional[Dict]:
    """
    Fetch content from a URL using Firecrawl API.

    Args:
        url: URL to fetch
        formats: List of formats to return (e.g., ["html", "markdown"])
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

    # Default formats if none provided
    if formats is None:
        formats = ["html"]

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


async def crawl_url(
    url: str,
    limit: int = 100,
    formats: List[str] = None,
    timeout: int = 300,
    poll_interval: int = 10,
) -> Optional[List[Dict]]:
    """
    Crawl a URL and its subpages using Firecrawl API.

    Args:
        url: URL to crawl
        limit: Maximum number of pages to crawl
        formats: List of formats to return (e.g., ["html", "markdown"])
        timeout: Timeout in seconds for the entire crawl
        poll_interval: Interval in seconds to poll for crawl status

    Returns:
        List of crawled pages data
    """
    # Get API key
    api_key = FIRECRAWL_API_KEY
    if not api_key:
        error_msg = "FIRECRAWL_API_KEY environment variable is not set"
        logger.error(error_msg)
        raise ValueError(error_msg)

    # Default formats if none provided
    if formats is None:
        formats = ["html"]

    # Set up payload
    payload = {"url": url, "limit": limit, "scrapeOptions": {"formats": formats}}

    # Set up headers
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    # Start the crawl
    logger.info(f"Starting crawl with Firecrawl: {url}")
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Start the crawl
            start_response = await client.post(
                "https://api.firecrawl.dev/v1/crawl",
                json=payload,
                headers=headers,
            )
            start_response.raise_for_status()

            data = start_response.json()
            if not data.get("success", False):
                logger.error(
                    f"Firecrawl API error: {data.get('error', 'Unknown error')}"
                )
                return None

            crawl_id = data.get("id")
            if not crawl_id:
                logger.error("Failed to get crawl ID from Firecrawl API")
                return None

            logger.info(f"Crawl started with ID: {crawl_id}")

            # Poll for crawl status
            start_time = asyncio.get_event_loop().time()
            next_url = f"https://api.firecrawl.dev/v1/crawl/{crawl_id}"
            all_results = []

            while asyncio.get_event_loop().time() - start_time < timeout:
                status_response = await client.get(
                    next_url,
                    headers=headers,
                )
                status_response.raise_for_status()
                status_data = status_response.json()

                # Add the data to our results
                if "data" in status_data and status_data["data"]:
                    all_results.extend(status_data["data"])

                # Check if there's more data to fetch with a 'next' URL
                if "next" in status_data and status_data["next"]:
                    next_url = status_data["next"]
                    logger.info("Fetching next page of crawl results")
                    continue

                # Check if the crawl is complete
                if status_data.get("status") == "completed":
                    logger.info(
                        f"Crawl completed: {len(all_results)} pages crawled for {url}"
                    )
                    return all_results

                logger.info(
                    f"Crawl in progress: {status_data.get('completed', 0)}/{status_data.get('total', 'unknown')} pages crawled"
                )
                await asyncio.sleep(poll_interval)

            logger.error(f"Crawl timed out for {url}")
            return all_results if all_results else None

    except httpx.HTTPStatusError as e:
        logger.error(
            f"HTTP error during crawl of {url}: {e.response.status_code} - {e.response.text}"
        )
        return None
    except Exception as e:
        logger.error(f"Error during crawl of {url}: {str(e)}")
        return None
