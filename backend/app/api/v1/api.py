from fastapi import APIRouter
from app.api.v1.endpoints import auth, analytics, predict, simulations, resources

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(predict.router, prefix="/predict", tags=["Predictions"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["Simulations"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resource Planning"])
