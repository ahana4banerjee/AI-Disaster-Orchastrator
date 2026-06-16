from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_resources():
    return {"message": "Endpoint resources initialized"}
