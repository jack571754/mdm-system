from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.mechanisms import router as mechanisms_router
from app.api.v1.change_logs import router as change_logs_router
from app.api.v1.sync import router as sync_router
from app.api.v1.quality import router as quality_router
from app.api.v1.admin import router as admin_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(mechanisms_router)
api_v1_router.include_router(change_logs_router)
api_v1_router.include_router(sync_router)
api_v1_router.include_router(quality_router)
api_v1_router.include_router(admin_router)
