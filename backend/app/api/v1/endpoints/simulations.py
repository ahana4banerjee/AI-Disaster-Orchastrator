from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_simulations():
    return {"message": "Endpoint simulations initialized"}
