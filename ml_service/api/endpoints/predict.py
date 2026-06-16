from fastapi import APIRouter

router = APIRouter()

@router.post("/")
async def run_predict(payload: dict):
    return {
        "severityClass": "High",
        "impactMetrics": {
            "expectedDeaths": 10,
            "expectedTotalAffected": 5000,
            "expectedDamageUSD": 100000.0
        }
      }
