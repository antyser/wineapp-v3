from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.config import settings
from app.core.supabase import get_supabase
from supabase import Client

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

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get(f"{settings.API_V1_STR}/test-supabase")
async def test_supabase(supabase: Client = Depends(get_supabase)):
    """
    Test endpoint to verify Supabase connection
    """
    try:
        # This is just to test the connection, in a real app you would query actual tables
        response = supabase.table("test").select("*").execute()
        return {"success": True, "message": "Successfully connected to Supabase"}
    except Exception as e:
        return {"success": False, "message": f"Failed to connect to Supabase: {str(e)}"}
