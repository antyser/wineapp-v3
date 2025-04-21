"""
Mock wines data for testing.

This module provides a consistent set of mock wine data for use in tests.
It centralizes the creation of test wine objects to ensure consistency across tests
and make it easier to maintain when the wine model changes.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from src.wines.schemas import EnrichedUserWine, Wine


def get_mock_wines() -> List[Dict]:
    """
    Return a list of mock wine dictionaries for testing.

    Returns:
        List[Dict]: A list of wine dictionaries with test data.
    """
    return [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "Château Margaux",
            "type": "Red",
            "country": "France",
            "region": "Bordeaux",
            "winery": "Château Margaux",
            "varietal": "Cabernet Sauvignon",
            "vintage": 2015,
            "price": 999.99,
            "tasting_notes": "Elegant and complex with notes of blackcurrant, cedar, and violets.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "Dom Pérignon",
            "type": "Sparkling",
            "country": "France",
            "region": "Champagne",
            "winery": "Moët & Chandon",
            "varietal": "Chardonnay, Pinot Noir",
            "vintage": 2010,
            "price": 299.99,
            "tasting_notes": "Crisp and refreshing with notes of citrus, white flowers, and toasted bread.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "name": "Opus One",
            "type": "Red",
            "country": "United States",
            "region": "Napa Valley",
            "winery": "Opus One Winery",
            "varietal": "Cabernet Sauvignon, Merlot",
            "vintage": 2018,
            "price": 499.99,
            "tasting_notes": "Full-bodied with rich notes of black fruit, vanilla, and spice.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Cloudy Bay Sauvignon Blanc",
            "type": "White",
            "country": "New Zealand",
            "region": "Marlborough",
            "winery": "Cloudy Bay",
            "varietal": "Sauvignon Blanc",
            "vintage": 2022,
            "price": 34.99,
            "tasting_notes": "Vibrant and zesty with notes of grapefruit, lemongrass, and passionfruit.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "55555555-5555-5555-5555-555555555555",
            "name": "Barolo Riserva",
            "type": "Red",
            "country": "Italy",
            "region": "Piedmont",
            "winery": "Conterno",
            "varietal": "Nebbiolo",
            "vintage": 2016,
            "price": 189.99,
            "tasting_notes": "Intense with notes of dried cherry, rose petal, and tar.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    ]


def get_mock_enriched_wines() -> List[Dict]:
    """
    Return a list of mock enriched wine dictionaries with user interaction data for testing.

    Returns:
        List[Dict]: A list of enriched wine dictionaries with test data.
    """
    base_wines = get_mock_wines()

    # Add user-specific fields to the wines
    enriched_wines = []
    for i, wine in enumerate(base_wines):
        enriched_wine = wine.copy()
        # Alternate between wishlist true/false
        enriched_wine["wishlist"] = i % 2 == 0
        # Alternate between ratings
        enriched_wine["rating"] = (i % 5) + 1 if i % 3 != 0 else None
        # Add some notes to a few wines
        if i % 2 == 0:
            enriched_wine["latest_note"] = (
                f"Great wine, enjoyed it with dinner on {datetime.now().strftime('%Y-%m-%d')}"
            )
            enriched_wine["latest_note_date"] = datetime.now(timezone.utc).isoformat()
        else:
            enriched_wine["latest_note"] = None
            enriched_wine["latest_note_date"] = None

        enriched_wine["last_interaction"] = datetime.now(timezone.utc).isoformat()
        enriched_wines.append(enriched_wine)

    return enriched_wines
