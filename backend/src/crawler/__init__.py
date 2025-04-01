"""Crawler package for scraping wine data."""

from src.crawler.firecrawl_api import batch_fetch_urls as firecrawl_batch_fetch
from src.crawler.firecrawl_api import crawl_url as firecrawl_crawl
from src.crawler.firecrawl_api import fetch_url as firecrawl_fetch
from src.crawler.wine_searcher import (
    WineSearcherOffer,
    WineSearcherWine,
    batch_fetch_wines,
    compose_search_url,
    fetch_wine,
    parse_wine_searcher_html,
    wine_searcher_to_csv,
)

__all__ = [
    "firecrawl_fetch",
    "firecrawl_batch_fetch",
    "firecrawl_crawl",
    "compose_search_url",
    "fetch_wine",
    "parse_wine_searcher_html",
    "batch_fetch_wines",
    "WineSearcherWine",
    "WineSearcherOffer",
    "wine_searcher_to_csv",
]
