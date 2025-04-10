from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client

from src.cellar import cellar_router
from src.core import get_supabase_client, settings
from src.search.api import router as search_history_router
from src.wines import wines_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for the Wine App",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(wines_router, prefix=settings.API_V1_STR)
app.include_router(cellar_router, prefix=settings.API_V1_STR)
app.include_router(search_history_router, prefix=settings.API_V1_STR)

# API routes will be included here as we develop each domain
# For now, just include some basic endpoints


@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint to verify the API is running
    and the Supabase connection is working
    """
    try:
        # This is just to test the connection
        client = get_supabase_client()
        # Execute a query to verify connection
        client.table("wines").select("*").execute()
        return {"success": True, "message": "Successfully connected to Supabase"}
    except Exception as e:
        return {"success": False, "message": f"Failed to connect to Supabase: {str(e)}"}


@app.get(f"{settings.API_V1_STR}/test-supabase")
async def test_supabase(supabase: Client = Depends(get_supabase_client)):
    """
    Test endpoint to verify Supabase connection
    """
    try:
        # This is just to test the connection
        supabase.table("wines").select("*").execute()
        return {"success": True, "message": "Successfully connected to Supabase"}
    except Exception as e:
        return {"success": False, "message": f"Failed to connect to Supabase: {str(e)}"}
