from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_auth():
    return {"message": "Endpoint auth initialized"}
