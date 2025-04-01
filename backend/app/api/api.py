from fastapi import APIRouter

from app.api.endpoints import wines

api_router = APIRouter()
api_router.include_router(wines.router, prefix="/wines", tags=["wines"])
