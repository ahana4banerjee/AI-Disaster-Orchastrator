from fastapi import APIRouter

router = APIRouter()

@router.post("/")
async def run_similarity(payload: dict):
    return [
        {
            "year": 2004,
            "country": payload.get("country", "Global"),
            "deaths": 12,
            "affectedPopulation": 10000,
            "similarityPercentage": 92.5
        }
    ]
