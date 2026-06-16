from fastapi import FastAPI
from api.endpoints import predict, similarity

app = FastAPI(
    title="AI Disaster Intelligence ML Inference Service",
    description="Dedicated microservice serving GBDT and KNN models",
    version="1.0.0"
)

app.include_router(predict.router, prefix="/predict", tags=["Inference"])
app.include_router(similarity.router, prefix="/similarity", tags=["Similarity Search"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
