from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.mechanisms import router as mechanisms_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(mechanisms_router)

