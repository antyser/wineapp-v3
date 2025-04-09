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

from src.crawler.firecrawl_api import batch_fetch_urls, fetch_url


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


async def fetch_wine(
    wine_name: str,
    vintage: Optional[str | int] = None,
    country: str = "usa",
) -> Optional[WineSearcherWine]:
    """
    Fetch a single wine from Wine-Searcher.com.

    Args:
        wine_name: Name of the wine to search for
        vintage: Optional vintage to filter by
        country: Country to filter by (default: usa)
        use_cache: Whether to use caching

    Returns:
        WineSearcherWine object if found, None otherwise
    """
    # Compose search URL
    url = compose_search_url(wine_name, vintage, country)
    logger.info(f"Searching for wine: {wine_name}, URL: {url}")

    # Fetch HTML
    html = await fetch_url(url)
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
    save_to_db: bool = False,
) -> Dict[str, Optional[WineSearcherWine]]:
    """
    Fetch multiple wines from Wine-Searcher.com.

    Args:
        wine_names: List of wine names to search for
        vintage: Optional vintage to filter by (applied to all wines)
        country: Country to filter by (default: usa)
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
    html_contents = await batch_fetch_urls(urls)

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
        if not name or not wine_searcher_id:
            logger.warning(f"No name or wine_searcher_id found for wine")
            return None
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
        python -m src.crawler.wine_searcher [wine_name] [--vintage VINTAGE] [--country COUNTRY] [--no-cache] [--save]
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
        # Import cache functions directly for test-parse mode only
        from src.crawler.firecrawl_api import CACHE_DIR, get_cache_key, load_from_cache

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
