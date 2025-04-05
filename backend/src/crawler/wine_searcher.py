"""
Wine Searcher module for fetching wine data from Wine-Searcher.com.

This module provides functions to search for wines on Wine-Searcher.com
and parse the results into structured data.
"""

import asyncio
import csv
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import unquote

import httpx
from loguru import logger
from lxml import etree
from lxml.html import fromstring
from pydantic import BaseModel, Field

from src.crawler.firecrawl_api import batch_fetch_urls as firecrawl_batch_fetch
from src.crawler.firecrawl_api import fetch_url as firecrawl_fetch

# Cache directory for storing HTML responses
CACHE_DIR = Path("./.cache/wine_searcher")


class WineSearcherOffer(BaseModel):
    """Offer from Wine-Searcher.com"""

    price: Optional[float] = None
    unit_price: Optional[float] = None
    description: Optional[str] = None
    seller_name: Optional[str] = None
    url: Optional[str] = None
    seller_address_region: Optional[str] = None
    seller_address_country: Optional[str] = None
    name: Optional[str] = None


class WineSearcherWine(BaseModel):
    """Wine from Wine-Searcher.com"""

    id: str
    wine_searcher_id: Optional[int] = None
    vintage: int = 1
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    region: Optional[str] = None
    region_image: Optional[str] = None
    origin: Optional[str] = None
    grape_variety: Optional[str] = None
    image: Optional[str] = None
    producer: Optional[str] = None
    average_price: Optional[float] = None
    min_price: Optional[float] = None
    wine_type: Optional[str] = None
    wine_style: Optional[str] = None
    offers: List[WineSearcherOffer] = Field(default_factory=list)
    offers_count: int = 0


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


def compose_search_url(
    keyword: str,
    vintage: Optional[str | int] = "",
    country: Optional[str] = "-",
    include_auction: Optional[bool] = False,
) -> str:
    """
    Composes the URL for the Wine-Searcher website.

    Args:
        keyword: The keyword to search for
        vintage: The vintage to search for (optional)
        country: The country to filter by (optional, "-" for all countries)
        include_auction: Whether to include auctions in the search (optional)

    Returns:
        The composed URL
    """
    # Extract vintage from the keyword if not provided
    if not vintage:
        match = re.search(r"(\d{4})", keyword)
        if match:
            vintage = match.group(1)
            # Remove the vintage from the keyword for URL construction
            keyword = re.sub(r"(\d{4})", "", keyword).strip()

    # Clean the keyword for URL construction
    # Replace special characters with spaces
    keyword_for_url = re.sub(r"[,\.\(\)&]", " ", keyword)
    # Replace spaces with hyphens
    keyword_for_url = re.sub(r"\s+", "-", keyword_for_url.strip())
    # Remove consecutive hyphens
    keyword_for_url = re.sub(r"-+", "-", keyword_for_url)

    url = f"https://www.wine-searcher.com/find/{keyword_for_url}/"
    if vintage:
        url += f"{vintage}/"
    if not include_auction:
        url += f"{country}/-/ndbipe?Xsort_order=p&Xcurrencycode=USD&Xsavecurrency=Y"
    return url


async def fetch_html(
    url: str, use_crawler: bool = True, use_cache: bool = True
) -> Optional[str]:
    """
    Fetch HTML from a URL, either directly, using a crawler, or from cache.

    Args:
        url: URL to fetch
        use_crawler: Whether to use the Firecrawl crawler (if False, uses httpx directly)
        use_cache: Whether to use caching (check cache first, save to cache if not found)

    Returns:
        HTML content as string, or None if fetch failed
    """
    # Try to load from cache first if caching is enabled
    if use_cache:
        cached_html = load_from_cache(url)
        if cached_html:
            logger.info(f"Using cached HTML for URL: {url}")
            return cached_html

    try:
        html_content = None

        if use_crawler:
            # Use Firecrawl crawler
            logger.info(f"Fetching URL with Firecrawl: {url}")
            response = await firecrawl_fetch(url, formats=["rawHtml"])
            if response and "rawHtml" in response:
                html_content = response.get("rawHtml", "")
                # Debug the response structure
                logger.debug(f"Firecrawl response type: {type(html_content)}")
                if isinstance(html_content, dict) and "content" in html_content:
                    # If HTML is wrapped in a content field (Firecrawl v1 format)
                    html_content = html_content.get("content", "")
            else:
                logger.warning(f"No HTML content in Firecrawl response for {url}")
        else:
            # Use direct httpx request with HTTP/2
            logger.info(f"Fetching URL directly with HTTP/2: {url}")
            async with httpx.AsyncClient(
                timeout=30,
                follow_redirects=True,
                http2=True,  # Enable HTTP/2
            ) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                html_content = response.text

        # Save to cache if we got content and caching is enabled
        if html_content and use_cache:
            save_to_cache(url, html_content)

        return html_content
    except Exception as e:
        logger.error(f"Error fetching URL {url}: {str(e)}")
        return None


async def batch_fetch_html(
    urls: List[str], use_crawler: bool = True, use_cache: bool = True
) -> List[Optional[str]]:
    """
    Fetch HTML from multiple URLs in parallel.

    Args:
        urls: List of URLs to fetch
        use_crawler: Whether to use the Firecrawl crawler
        use_cache: Whether to use caching

    Returns:
        List of HTML content as strings, None for failed fetches
    """
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
        try:
            if use_crawler:
                # Use Firecrawl crawler for batch fetching
                fetch_urls = [url for _, url in urls_to_fetch]
                logger.info(f"Batch fetching {len(fetch_urls)} URLs with Firecrawl")
                responses = await firecrawl_batch_fetch(fetch_urls, formats=["html"])

                # Process responses
                for i, ((idx, url), response) in enumerate(
                    zip(urls_to_fetch, responses)
                ):
                    if response and "html" in response:
                        html_content = response.get("html", "")
                        if isinstance(html_content, dict) and "content" in html_content:
                            html_content = html_content.get("content", "")

                        # Save to cache if enabled
                        if use_cache and html_content:
                            save_to_cache(url, html_content)

                        results[idx] = html_content
            else:
                # Use direct httpx requests with concurrency and HTTP/2
                logger.info(
                    f"Batch fetching {len(urls_to_fetch)} URLs directly with HTTP/2"
                )
                concurrency = min(10, len(urls_to_fetch))  # Limit concurrency
                semaphore = asyncio.Semaphore(concurrency)

                async def fetch_with_semaphore(idx, url):
                    async with semaphore:
                        html = await fetch_html(url, use_crawler=False, use_cache=False)
                        if html and use_cache:
                            save_to_cache(url, html)
                        return idx, html

                tasks = [fetch_with_semaphore(idx, url) for idx, url in urls_to_fetch]
                completed_tasks = await asyncio.gather(*tasks)

                # Update results with fetched content
                for idx, html in completed_tasks:
                    results[idx] = html
        except Exception as e:
            logger.error(f"Error in batch fetch: {str(e)}")

    return results


async def fetch_wine(
    wine_name: str,
    vintage: Optional[str | int] = None,
    country: str = "usa",
    use_crawler: bool = True,
    use_cache: bool = True,
) -> Optional[WineSearcherWine]:
    """
    Fetch a single wine from Wine-Searcher.com.

    Args:
        wine_name: Name of the wine to search for
        vintage: Optional vintage to filter by
        country: Country to filter by (default: usa)
        use_crawler: Whether to use a third-party crawler
        use_cache: Whether to use caching

    Returns:
        WineSearcherWine object if found, None otherwise
    """
    # Compose search URL
    url = compose_search_url(wine_name, vintage, country)
    logger.info(f"Searching for wine: {wine_name}, URL: {url}")

    # Fetch HTML
    html = await fetch_html(url, use_crawler, use_cache)
    if not html:
        logger.warning(f"Failed to fetch wine: {wine_name}")
        return None

    # Parse HTML into WineSearcherWine object
    wine = parse_wine_searcher_html(html)
    if wine:
        logger.info(f"Successfully parsed wine: {wine.name} ({wine.vintage})")
    else:
        logger.warning(f"Failed to parse wine: {wine_name}")

    return wine


async def batch_fetch_wines(
    wine_names: List[str],
    vintage: Optional[str | int] = None,
    country: str = "usa",
    use_crawler: bool = True,
    use_cache: bool = True,
    save_to_db: bool = False,
) -> Dict[str, Optional[WineSearcherWine]]:
    """
    Fetch multiple wines from Wine-Searcher.com.

    Args:
        wine_names: List of wine names to search for
        vintage: Optional vintage to filter by (applied to all wines)
        country: Country to filter by (default: usa)
        use_crawler: Whether to use a third-party crawler
        use_cache: Whether to use caching
        save_to_db: Whether to save found wines to the database

    Returns:
        Dictionary mapping wine names to WineSearcherWine objects or None if not found
    """
    # Compose search URLs
    urls = [compose_search_url(name, vintage, country) for name in wine_names]

    # Log the URLs being fetched
    for i, (wine_name, url) in enumerate(zip(wine_names, urls)):
        logger.info(f"Fetching wine {i + 1}/{len(wine_names)}: {wine_name}")
        logger.debug(f"URL: {url}")

    # Fetch HTML for all URLs
    html_contents = await batch_fetch_html(urls, use_crawler, use_cache)

    # Parse each HTML into WineSearcherWine objects
    result = {}
    wines_to_save = []

    for wine_name, html in zip(wine_names, html_contents):
        if html:
            try:
                wine = parse_wine_searcher_html(html)
                result[wine_name] = wine

                if wine:
                    if save_to_db:
                        wines_to_save.append(wine)
                    logger.info(
                        f"Successfully parsed wine: {wine.name} ({wine.vintage})"
                    )
                else:
                    logger.warning(f"Failed to parse wine: {wine_name}")
            except Exception as e:
                logger.error(f"Error parsing wine {wine_name}: {str(e)}")
                result[wine_name] = None
        else:
            logger.warning(f"Failed to fetch wine: {wine_name}")
            result[wine_name] = None

    # Save wines to database if requested
    if save_to_db and wines_to_save:
        asyncio.create_task(save_wines_batch(wines_to_save))
        logger.info(f"Scheduled saving of {len(wines_to_save)} wines")

    return result


def parse_wine_searcher_html(html: str) -> Optional[WineSearcherWine]:
    """
    Parse Wine-Searcher HTML to extract wine data.

    Args:
        html: HTML content from Wine-Searcher.com

    Returns:
        WineSearcherWine object or None if parsing fails
    """
    try:
        if not html:
            logger.warning("No HTML content to parse")
            return None

        # Parse HTML with lxml
        if isinstance(html, str):
            root = fromstring(html)
        else:
            # Already an HTML element
            root = html

        # Extract wine data using XPath
        wine_searcher_id_str = root.xpath("//h1/@data-name-id")
        wine_searcher_id = (
            int(wine_searcher_id_str[0]) if wine_searcher_id_str else None
        )

        name_elements = root.xpath("//h1/text()")
        name = name_elements[0].strip() if name_elements else None

        # Extract description (potentially split across multiple p tags)
        description_elements = root.xpath(
            "//li[contains(@class, 'prod-profile__review')]//li[contains(@class, 'smaller')]//p/text()"
        )
        description = (
            " ".join([el.strip() for el in description_elements if el.strip()])
            if description_elements
            else None
        )

        og_url_elements = root.xpath('//meta[@property="og:url"]/@content')
        og_url = og_url_elements[0] if og_url_elements else None

        # Extract vintage from URL
        match = re.search(r"/(\d{4})/", og_url) if og_url else None
        vintage_str = match.group(1) if match else None
        vintage = str_to_vintage(vintage_str) if vintage_str else 1

        region_elements = root.xpath('//meta[@name="productRegion"]/@content')
        region = region_elements[0] if region_elements else None

        origin_elements = root.xpath('//meta[@name="productOrigin"]/@content')
        origin = origin_elements[0] if origin_elements else None

        image_elements = root.xpath('//meta[@property="og:image"]/@content')
        image = image_elements[0] if image_elements else None

        # Extract average price from description meta
        price_description_elements = root.xpath('//meta[@name="description"]/@content')
        price_description = (
            price_description_elements[0] if price_description_elements else ""
        )
        average_price = (
            _extract_average_price(price_description) if price_description else None
        )

        grape_variety_elements = root.xpath('//meta[@name="productVarietal"]/@content')
        grape_variety = grape_variety_elements[0] if grape_variety_elements else None

        # Parse wine style and type
        wine_type = None
        wine_style = None
        style_text_elements = root.xpath(
            "//span[contains(@class, 'prod-profile__style')]//span[contains(@class, 'font-light-bold')]/text()"
        )
        style_text = style_text_elements[0] if style_text_elements else None
        if style_text and " - " in style_text:
            wine_type, wine_style = style_text.split(" - ", 1)

        # Extract producer
        producer_elements = root.xpath('//a[@id="MoreProducerDetail"]/@title')
        producer = producer_elements[0] if producer_elements else None
        if producer:
            producer = producer.replace("More information about ", "")

        # Parse offers
        offers_html = "".join(
            [
                etree.tostring(el, encoding="unicode")
                for el in root.xpath('//div[@id="pjax-offers"]')
            ]
        )
        offers, offers_count = parse_offers_html(offers_html)

        # Calculate min price
        min_price = min(
            [o.unit_price for o in offers if o.unit_price is not None], default=None
        )

        # Create WineSearcherWine object
        return WineSearcherWine(
            id=str(f"{wine_searcher_id}_{vintage}"),
            wine_searcher_id=wine_searcher_id,
            vintage=vintage,
            name=name,
            url=og_url,
            description=description,
            region=region,
            region_image=None,  # Not available in extraction
            origin=origin,
            grape_variety=grape_variety,
            image=image,
            producer=producer,
            average_price=average_price,
            min_price=min_price,
            wine_type=wine_type,
            wine_style=wine_style,
            offers=offers,
            offers_count=offers_count,
        )
    except Exception as e:
        logger.warning(f"Error in parse_wine_searcher_html: {e}")
        return None


def str_to_vintage(vintage_str: Optional[str]) -> int:
    """
    Convert vintage string to integer.

    Args:
        vintage_str: Vintage as string

    Returns:
        Vintage as integer, or 1 if not a valid vintage
    """
    if not vintage_str:
        return 1
    return 1 if vintage_str == "All" else int(vintage_str)


def parse_float(value: str) -> Optional[float]:
    """
    Parse a string to a float.

    Args:
        value: String to parse

    Returns:
        Parsed float or None if parsing fails
    """
    try:
        return float(value)
    except ValueError:
        logger.error(f"Failed to parse float from value: {value}")
        return None


def _extract_average_price(price_description: str) -> Optional[float]:
    """
    Extract average price from price description.

    Args:
        price_description: Price description from meta tag

    Returns:
        Average price as float, or None if extraction fails
    """
    try:
        average_price_str = price_description.split("$")[1].split("/")[0].strip()
        average_price_str = average_price_str.replace(",", "")
        return float(average_price_str)
    except (IndexError, ValueError, AttributeError) as e:
        logger.warning(f"Failed to extract average price: {e}")
        return None


def parse_offers_html(offers_html: str) -> Tuple[List[WineSearcherOffer], int]:
    """
    Parse offers HTML to extract offers.

    Args:
        offers_html: HTML of the offers section

    Returns:
        Tuple of (list of offers, offer count)
    """
    offers = []
    offers_count = 0

    if not offers_html:
        return offers, offers_count

    root = fromstring(offers_html)

    # Check if search was expanded
    expanded_info = root.xpath('//div[contains(@class, "auto-expand-card")]')
    if expanded_info:
        return [], 0

    # Extract offers count
    offers_count_element = root.xpath(
        '//div[1]//span[@class="font-weight-bold"]/text()'
    )
    if offers_count_element:
        offers_count = int(offers_count_element[0].split()[0])

    # Extract offers
    offer_cards = root.xpath('//div[contains(@class, "offer-card__container")]')

    for offer_card in offer_cards:
        try:
            price_section = offer_card.xpath(
                './/div[contains(@class, "offer-card__price-section")]'
            )[0]
            price_detail = price_section.xpath(
                './/div[contains(@class, "price__detail_main")]'
            )[0]

            seller_name = next(
                iter(
                    offer_card.xpath(
                        './/a[contains(@class, "offer-card__merchant-name")]/text()'
                    )
                ),
                None,
            )
            price_str = price_detail.text_content()
            price = (
                float(price_str.replace("$", "").replace(",", ""))
                if price_str
                else None
            )

            unit_price_detail = price_section.xpath(
                './/div[contains(@class, "price__detail_secondary")]'
            )
            if not unit_price_detail:
                unit_price = price
            else:
                unit_price_str = unit_price_detail[0].text_content()
                unit_price = (
                    float(
                        unit_price_str.split("/")[0].replace("$", "").replace(",", "")
                    )
                    if unit_price_str
                    else None
                )

            encoded_url = next(
                iter(offer_card.xpath('.//a[contains(@class, "col2")]/@href')), None
            )
            url = unquote(encoded_url) if encoded_url else None

            location = next(
                iter(
                    offer_card.xpath(
                        './/div[contains(@class, "offer-card__location-address")]/text()'
                    )
                ),
                None,
            )
            seller_address_region = (
                location.split(":")[-1].strip() if location else None
            )

            country_flag = next(
                iter(
                    offer_card.xpath(
                        './/svg[contains(@class, "offer-card__location-flag")]/@class'
                    )
                ),
                None,
            )
            seller_address_country = (
                country_flag.split()[-1].replace("icon-flag-", "").upper()
                if country_flag
                else None
            )

            description = next(
                iter(
                    offer_card.xpath(
                        './/div[contains(@class, "mb-2 small d-full-card-only")]/text()'
                    )
                ),
                None,
            )

            offers.append(
                WineSearcherOffer(
                    price=price,
                    unit_price=unit_price,
                    description=description,
                    seller_name=seller_name,
                    url=url,
                    seller_address_region=seller_address_region,
                    seller_address_country=seller_address_country,
                )
            )
        except Exception as e:
            logger.warning(f"Error parsing offer: {e}")
            continue

    return offers, offers_count


async def save_wines_batch(wines: List[WineSearcherWine]) -> None:
    """
    Save a batch of wines to the wine_searcher_wines and offers tables.

    Args:
        wines: List of WineSearcherWine objects to save
    """
    from src.core import get_supabase_client

    client = get_supabase_client()

    for wine in wines:
        try:
            # Convert WineSearcherWine to dict for insertion
            wine_data = {
                "id": wine.id,
                "wine_searcher_id": wine.wine_searcher_id,
                "vintage": wine.vintage,
                "name": wine.name,
                "url": wine.url,
                "region": wine.region,
                "region_image": wine.region_image,
                "origin": wine.origin,
                "grape_variety": wine.grape_variety,
                "image": wine.image,
                "producer": wine.producer,
                "average_price": wine.average_price,
                "wine_type": wine.wine_type,
                "wine_style": wine.wine_style,
                "min_price": wine.min_price,
                "description": wine.description,
                "offers_count": wine.offers_count,
            }

            # Insert or update wine
            response = client.table("wine_searcher_wines").upsert(wine_data).execute()

            if not response.data:
                logger.error(
                    f"Failed to save wine {wine.name} to wine_searcher_wines table"
                )
                continue

            # Now insert offers if any
            if wine.offers:
                for offer in wine.offers:
                    offer_data = {
                        "wine_id": wine.id,
                        "price": offer.price if offer.price is not None else 0,
                        "unit_price": (
                            offer.unit_price if offer.unit_price is not None else 0
                        ),
                        "description": offer.description,
                        "seller_name": offer.seller_name,
                        "url": offer.url,
                        "seller_address_region": offer.seller_address_region,
                        "seller_address_country": offer.seller_address_country,
                        "name": offer.name,
                    }

                    offer_response = client.table("offers").insert(offer_data).execute()
                    if not offer_response.data:
                        logger.warning(f"Failed to save offer for wine {wine.name}")

            logger.info(
                f"Saved wine: {wine.name} ({wine.vintage}) with {len(wine.offers)} offers"
            )
        except Exception as e:
            logger.error(
                f"Error saving wine {wine.name if wine.name else 'unknown'}: {str(e)}"
            )


async def main():
    """
    Main function for command-line execution.

    Usage:
        python -m src.crawler.wine_searcher [wine_name] [--vintage VINTAGE] [--country COUNTRY] [--no-crawler] [--no-cache] [--save]
    """
    import argparse

    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Fetch wine data from Wine-Searcher.com"
    )
    parser.add_argument("wine_name", help="Name of the wine to search for")
    parser.add_argument("--vintage", type=str, help="Vintage to search for")
    parser.add_argument(
        "--country", type=str, default="usa", help="Country to filter by (default: usa)"
    )
    parser.add_argument(
        "--no-crawler", action="store_true", help="Don't use Firecrawl, fetch directly"
    )
    parser.add_argument("--no-cache", action="store_true", help="Don't use cached data")
    parser.add_argument("--save", action="store_true", help="Save results to database")
    parser.add_argument(
        "--test-parse",
        action="store_true",
        help="Test parsing using a cached URL without making API calls",
    )

    # Parse arguments
    args = parser.parse_args()

    # Configure logger
    logger.add(sys.stderr, level="INFO")

    if args.test_parse:
        # Create cache directory structure if needed
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        # Just test parsing functionality using a cached entry if available
        url = compose_search_url(
            args.wine_name, vintage=args.vintage, country=args.country
        )

        # First check if we have a cached entry
        cached_html = load_from_cache(url)

        if cached_html:
            logger.info(f"Testing parsing with cached data for: {url}")
            wine = parse_wine_searcher_html(cached_html)

            if wine:
                print(
                    f"Successfully parsed wine from cache: {wine.name} ({wine.vintage})"
                )
                print(f"Producer: {wine.producer}")
                print(f"Region: {wine.region}, Origin: {wine.origin}")
                print(f"Type: {wine.wine_type}, Style: {wine.wine_style}")
                print(f"Average price: ${wine.average_price}")
                print(f"Offers count: {wine.offers_count}")
            else:
                print("Failed to parse wine from cached data")
        else:
            # List available cached files
            cache_files = list(CACHE_DIR.glob("*.html"))
            if cache_files:
                print(
                    f"No cached data for '{args.wine_name}', but found {len(cache_files)} cached entries."
                )
                print("Available cached wines:")
                for cache_file in cache_files:
                    try:
                        with open(cache_file, "r", encoding="utf-8") as f:
                            first_line = f.readline().strip()
                            if first_line.startswith("<!-- URL:"):
                                url = first_line[
                                    10:-4
                                ].strip()  # Extract URL from comment
                                print(f"  - {url} (Cache: {cache_file.name})")
                            else:
                                print(f"  - Unknown wine (Cache: {cache_file.name})")
                    except Exception:
                        print(f"  - Error reading cache file: {cache_file.name}")
            else:
                print(
                    "No cached data available. Run a regular search first to populate the cache."
                )
    else:
        # Regular wine search
        wine = await fetch_wine(
            args.wine_name,
            vintage=args.vintage,
            country=args.country,
            use_crawler=not args.no_crawler,
            use_cache=not args.no_cache,
        )

        if wine:
            # Print result
            print(f"Found wine: {wine.name} ({wine.vintage})")
            print(f"Producer: {wine.producer}")
            print(f"Region: {wine.region}, Origin: {wine.origin}")
            print(f"Type: {wine.wine_type}, Style: {wine.wine_style}")
            print(f"Average price: ${wine.average_price}")
            print(f"Offers count: {wine.offers_count}")

            # Save to database if requested
            if args.save:
                await save_wines_batch([wine])
                print("Saved wine to database")

            # Print wine as JSON
            print("\nWine data (JSON):")
            print(json.dumps(wine.model_dump(), indent=2))
        else:
            print(f"No wine found for: {args.wine_name}")


def test_parse_from_file(file_path: str) -> Optional[WineSearcherWine]:
    """
    Test parsing from a local HTML file

    Args:
        file_path: Path to the HTML file to parse

    Returns:
        Parsed wine or None if parsing failed
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            html = f.read()

        wine = parse_wine_searcher_html(html)
        print(wine.model_dump_json(indent=2))
    except Exception as e:
        logger.error(f"Error parsing file {file_path}: {str(e)}")
        return None


if __name__ == "__main__":
    """Run main function when executed directly"""
    test_parse_from_file("/Users/junliu/Downloads/result_raw_html.html")
