from app.api.endpoints import wines
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(wines.router, prefix="/wines", tags=["wines"]) 