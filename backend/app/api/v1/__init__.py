from fastapi import APIRouter

from app.api.v1 import admin, auth, diagnoses, diseases, surveys, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(diagnoses.router, prefix="/diagnoses", tags=["diagnoses"])
api_router.include_router(diseases.router, prefix="/diseases", tags=["diseases"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
