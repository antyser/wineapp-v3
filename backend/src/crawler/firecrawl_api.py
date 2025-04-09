"""
Firecrawl API client for fetching web content.

This module provides functions to fetch web content using Firecrawl API.
https://docs.firecrawl.dev/introduction#crawling
"""

import asyncio
import hashlib
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

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

# Cache directory for storing HTML responses
CACHE_DIR = Path("./.cache/firecrawl")


def get_cache_key(url: str) -> str:
    """
    Generate a cache key from a URL

    Args:
        url: The URL to generate a cache key for

    Returns:
        A cache key (filename) for the URL
    """
    # Use MD5 hash of the URL as the filename to avoid illegal characters
    hash_obj = hashlib.md5(url.encode())
    return hash_obj.hexdigest() + ".html"


def save_to_cache(url: str, html: str) -> bool:
    """
    Save HTML content to cache

    Args:
        url: The URL that was fetched
        html: The HTML content to cache

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        # Create cache directory if it doesn't exist
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        cache_key = get_cache_key(url)
        cache_file = CACHE_DIR / cache_key

        # Save the HTML content
        with open(cache_file, "w", encoding="utf-8") as f:
            # Store the URL as a comment at the beginning of the file
            f.write(f"<!-- URL: {url} -->\n")
            f.write(html)

        logger.info(f"Saved HTML to cache: {cache_file}")
        return True
    except Exception as e:
        logger.error(f"Error saving to cache: {str(e)}")
        return False


def load_from_cache(url: str) -> Optional[str]:
    """
    Load HTML content from cache

    Args:
        url: The URL to load from cache

    Returns:
        The cached HTML content or None if not found
    """
    try:
        cache_key = get_cache_key(url)
        cache_file = CACHE_DIR / cache_key

        if not cache_file.exists():
            return None

        with open(cache_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Skip the URL comment line
            if content.startswith("<!-- URL:"):
                content = "\n".join(content.split("\n")[1:])

        logger.info(f"Loaded HTML from cache: {cache_file}")
        return content
    except Exception as e:
        logger.error(f"Error loading from cache: {str(e)}")
        return None


async def fetch_url(
    url: str,
    formats: List[str] = ["rawHtml"],
    timeout: int = 60,
    use_cache: bool = True,
) -> str:
    """
    Fetch HTML content from a URL using Firecrawl API with caching support.

    Args:
        url: URL to fetch
        formats: List of formats to return (default is ["rawHtml"])
        timeout: Timeout in seconds
        use_cache: Whether to use caching

    Returns:
        Raw HTML content as string, or None if fetch failed
    """
    # Try to load from cache first if caching is enabled
    if use_cache:
        cached_html = load_from_cache(url)
        if cached_html:
            logger.info(f"Using cached HTML for URL: {url}")
            return cached_html

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
                data = result.get("data", {})

                # Extract HTML content
                html_content = None
                if "rawHtml" in data:
                    html_content = data.get("rawHtml", "")
                    # Debug the response structure
                    logger.debug(f"Firecrawl response type: {type(html_content)}")
                    if isinstance(html_content, dict) and "content" in html_content:
                        # If HTML is wrapped in a content field (Firecrawl v1 format)
                        html_content = html_content.get("content", "")

                # Save to cache if we got content and caching is enabled
                if html_content and use_cache:
                    save_to_cache(url, html_content)

                return html_content
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
    urls: List[str],
    formats: List[str] = ["rawHtml"],
    concurrency: int = 5,
    use_cache: bool = True,
) -> List[Optional[str]]:
    """
    Fetch HTML from multiple URLs in parallel with caching support.

    Args:
        urls: List of URLs to fetch
        formats: List of formats to return (default is ["rawHtml"])
        concurrency: Maximum number of concurrent requests
        use_cache: Whether to use caching

    Returns:
        List of HTML content as strings, None for failed fetches
    """
    if not urls:
        return []

    results = []
    urls_to_fetch = []
    cached_indices = []

    # First, try to load from cache for each URL
    if use_cache:
        for i, url in enumerate(urls):
            cached_html = load_from_cache(url)
            if cached_html:
                results.append(cached_html)
                cached_indices.append(i)
            else:
                results.append(None)  # Placeholder, will be updated after fetching
                urls_to_fetch.append((i, url))
    else:
        # No caching, fetch all URLs
        results = [None] * len(urls)
        urls_to_fetch = list(enumerate(urls))

    # If we have URLs to fetch
    if urls_to_fetch:
        # Use semaphore to limit concurrency
        semaphore = asyncio.Semaphore(concurrency)

        async def fetch_with_semaphore(idx, url):
            async with semaphore:
                html = await fetch_url(url, formats=formats, use_cache=False)
                if html and use_cache:
                    save_to_cache(url, html)
                return idx, html

        # Fetch URLs in parallel
        logger.info(
            f"Batch fetching {len(urls_to_fetch)} URLs with concurrency {concurrency}"
        )
        tasks = [fetch_with_semaphore(idx, url) for idx, url in urls_to_fetch]
        completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        for result in completed_tasks:
            if isinstance(result, Exception):
                logger.error(f"Error in batch fetch: {str(result)}")
            else:
                idx, html = result
                results[idx] = html

    return results


if __name__ == "__main__":
    asyncio.run(fetch_url("https://www.wine-searcher.com/", formats=["rawHtml"]))
