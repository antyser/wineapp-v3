from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WineSearcherOffer(BaseModel):
    """Offer from Wine-Searcher.com, under price tab"""

    price: Optional[float] = Field(
        default=None, description="Price from the offer card's main price detail."
    )
    unit_price: Optional[float] = Field(
        default=None,
        description="Unit price from the offer card's secondary price detail, or same as price if not present.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Offer description text, often includes size/condition.",
    )
    seller_name: Optional[str] = Field(
        default=None, description="Merchant name from the offer card."
    )
    url: Optional[str] = Field(
        default=None, description="Decoded URL linking to the merchant's offer page."
    )
    seller_address_region: Optional[str] = Field(
        default=None, description="Seller's region/state from the offer card location."
    )
    seller_address_country: Optional[str] = Field(
        default=None,
        description="Seller's country code from the offer card location flag.",
    )
    name: Optional[str] = Field(
        default=None,
        description="Specific name/vintage of the offer if different from main wine, usually null.",
    )


class WineProfile(BaseModel):
    """Information displayed under the profile tab or main product details section of wine details"""

    # Individual profile fields
    winery: Optional[str] = Field(
        default=None,
        description="Winery/Producer name, often linked near the wine title.",
    )
    region_or_appellation: Optional[str] = Field(
        default=None,
        description="Region/Appellation from the wine subtitle or meta tags.",
    )
    grape_variety: Optional[str] = Field(
        default=None, description="Grape variety from meta tags or profile details."
    )
    style: Optional[str] = Field(
        default=None,
        description="Wine style description (e.g., 'Buttery and Complex') from main details or profile tab.",
    )
    food_pairing: Optional[str] = Field(
        default=None,
        description="Suggested food pairing from profile tab or sometimes main details.",
    )
    drinking_window: Optional[str] = Field(
        default=None,
        description="Recommended drinking window (e.g., '2026-2032') from profile tab.",
    )
    abv: Optional[str] = Field(
        default=None,
        description="Alcohol by Volume percentage (e.g., '13.5%') from profile tab.",
    )
    ownership: Optional[str] = Field(
        default=None, description="Ownership details from profile tab."
    )


class VintageInfo(BaseModel):
    """Information about a specific vintage found in the 'Compare Vintages' table"""

    year: str = Field(
        description="Year of the vintage (e.g., '2019' or 'All') from the table row."
    )
    critics_score: Optional[str] = Field(
        default=None, description="Critics score (e.g., '91/100') from the table row."
    )
    avg_price: Optional[float] = Field(
        default=None,
        description="Average price (ex-tax) for that vintage from the table row.",
    )


class Vintages(BaseModel):
    """Vintage comparison information under the vintages tab"""

    current_vintage: Optional[str] = Field(
        default=None,
        description="Header for the current vintage details (e.g., '2019 Vintage: Burgundy').",
    )
    vintage_quality: Optional[str] = Field(
        default=None,
        description="Overall quality assessment (e.g., 'Good (Excellent)').",
    )
    current_condition: Optional[str] = Field(
        default=None,
        description="Current drinking condition (e.g., 'Ready to drink', 'Will keep').",
    )
    vintage_description: Optional[str] = Field(
        default=None, description="Text description of the vintage conditions."
    )
    vintage_list: List[VintageInfo] = Field(
        default_factory=list,
        description="List of all vintages parsed from the 'Compare Vintages' table.",
    )


class WineSearcherWine(BaseModel):
    """Represents a wine page on Wine-Searcher.com"""

    id: str = Field(
        description="Unique identifier combining wine_searcher_id and vintage: '<wine_searcher_id>_<vintage>'."
    )
    wine_searcher_id: Optional[int] = Field(
        default=None,
        description="Wine-Searcher's internal ID for the wine name, from h1 tag data-name-id.",
    )
    vintage: int = Field(
        default=1,
        description="Vintage year extracted from URL or explicitly listed, defaults to 1 for 'All' or non-vintage.",
    )
    name: Optional[str] = Field(
        default=None, description="Full wine name from the main h1 title."
    )
    url: Optional[str] = Field(
        default=None,
        description="Canonical URL of the wine page from meta tags or link rel='canonical'.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Wine description, often includes critic tasting notes, from product details section.",
    )
    region: Optional[str] = Field(
        default=None, description="Primary region from meta tags (productRegion). "
    )
    origin: Optional[str] = Field(
        default=None,
        description="Origin country/detailed region from meta tags (productOrigin). ",
    )
    grape_variety: Optional[str] = Field(
        default=None,
        description="Grape variety from meta tags (productVarietal) or profile.",
    )
    image: Optional[str] = Field(
        default=None,
        description="URL of the primary wine label image from meta tags or product image element.",
    )
    producer: Optional[str] = Field(
        default=None,
        description="Producer/Winery name, extracted near the title or from profile.",
    )
    average_price: Optional[float] = Field(
        default=None,
        description="Average price (ex-tax) displayed prominently, usually for the specific vintage.",
    )
    min_price: Optional[float] = Field(
        default=None,
        description="Minimum price found across available offers, potentially across vintages if specific vintage has no offers. Based on the first offer price shown.",
    )
    wine_type: Optional[str] = Field(
        default=None,
        description="Wine type (e.g., 'Red', 'White') derived from style text.",
    )
    wine_style: Optional[str] = Field(
        default=None,
        description="Wine style description (e.g., 'Savory and Classic') from main details.",
    )
    profile: Optional[WineProfile] = Field(
        default=None,
        description="Structured profile information, parsed from the profile tab or main details section.",
    )
    vintages: Optional[Vintages] = Field(
        default=None,
        description="Vintage comparison information, parsed from the vintages tab/section.",
    )
    offers: List[WineSearcherOffer] = Field(
        default_factory=list,
        description="List of offers parsed from the offers section. Empty if no offers specifically for this vintage.",
    )
    offers_count: int = Field(
        default=0, description="Total count of offers listed in the offers section."
    )
