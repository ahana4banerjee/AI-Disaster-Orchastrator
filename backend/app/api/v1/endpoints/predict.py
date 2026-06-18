import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.core.config import settings

router = APIRouter()

class DisasterPredictionPayload(BaseModel):
    disasterType: str = Field(..., example="Storm")
    disasterSubtype: str = Field(..., example="Tropical cyclone")
    country: str = Field(..., example="India")
    region: str = Field(..., example="Odisha")
    magnitude: float = Field(..., gt=0, example=220.0)
    startMonth: int = Field(..., ge=1, le=12, example=10)

class DisasterSimilarityPayload(BaseModel):
    disasterType: str = Field(..., example="Storm")
    country: str = Field(..., example="India")
    region: str = Field(..., example="Odisha")
    magnitude: float = Field(..., gt=0, example=220.0)

@router.post("/impact")
async def predict_impact(payload: DisasterPredictionPayload):
    """
    Forwards the disaster parameters to the ML service to obtain predicted severity class and impacts.
    """
    url = f"{settings.ML_SERVICE_URL}/predict/"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload.model_dump(), timeout=10.0)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"ML Service returned an error: {resp.text}")
            return resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to communicate with ML service: {str(e)}")

@router.post("/similarity")
async def search_similarity(payload: DisasterSimilarityPayload):
    """
    Forwards query parameters to the ML service to search similar historical events.
    """
    url = f"{settings.ML_SERVICE_URL}/similarity/"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload.model_dump(), timeout=10.0)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"ML Service returned an error: {resp.text}")
            return resp.json()
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Failed to communicate with ML service: {str(e)}")
