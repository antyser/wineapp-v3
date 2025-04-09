import base64
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types


def generate(query: str):
    load_dotenv(".env")
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    #model = "gemini-2.0-flash"
    model = "gemini-2.5-pro-exp-03-25"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=query),
            ],
        ),
    ]
    tools = [
        types.Tool(google_search=types.GoogleSearch())
    ]
    generate_content_config = types.GenerateContentConfig(
        tools=tools,
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text="""you're a wine expert, find these information. think step by step and find the information with search tool.
Make sure you get the wine information matches the specific vintage.


    name: str  # The full name of the wine.
    winery: Optional[str] = None  # The winery or producer of the wine.
    vintage: Optional[int] = None  # The vintage year of the wine (e.g., 2018).
    region: Optional[str] = (
        None  # The geographical region where the wine is produced (e.g., Napa Valley).
    )
    country: Optional[str] = None  # The country of origin for the wine (e.g., USA).
    varietal: Optional[str] = (
        None  # The primary grape varietal(s) used (e.g., Cabernet Sauvignon).
    )
    type: Optional[str] = None  # The type of wine (e.g., Red, White, Rosé, Sparkling).
    price: Optional[float] = None  # The estimated or known retail price of the wine.
    rating: Optional[int] = None  # A numerical rating score for the wine (e.g., 92).
    tasting_notes: Optional[str] = (
        None  # User or expert tasting notes describing the wine's characteristics.
    )
    average_price: Optional[float] = (
        None  # The average market price, potentially aggregated from multiple sources.
    )
    description: Optional[str] = None  # A general description of the wine.
    wine_searcher_url: Optional[str] = (
        None  # URL link to the wine's page on Wine-Searcher.
    )
    vivino_url: Optional[str] = None  # URL link to the wine's page on Vivino.
    cellartracker_url: Optional[str] = (
        None  # URL link to the wine's page on CellarTracker.
    )
    wine_label_image_url: Optional[str] = (
        None  # URL of an image showing the wine label.
    )
    abv: Optional[str] = (
        None  # Alcohol By Volume percentage (e.g., "14.5%"). Stored as string for flexibility.
    )
    drinking_window: Optional[str] = (
        None  # Recommended timeframe for optimal consumption (e.g., "2024-2030").
    )
    offer_links: Optional[List[str]] = (
        None  # List of URLs to online retailers or offers for purchasing the wine.
    )
    wine_maker_notes: Optional[str] = (
        None  # Official notes or description provided by the winemaker or producer.
    )"""),
        ],
    )

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=generate_content_config,
    )
    print(response)
    return response

if __name__ == "__main__":
    generate("""
    name: Opus One 2018
    vintage: 2018
    winery: Opus One
    region: Napa Valley
    """)
