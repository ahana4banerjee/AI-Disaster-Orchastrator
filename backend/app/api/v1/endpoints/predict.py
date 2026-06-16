from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_predict():
    return {"message": "Endpoint predict initialized"}
