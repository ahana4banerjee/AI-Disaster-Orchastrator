from pydantic import BaseModel

class DisasterInput(BaseModel):
    disaster_type: str
    magnitude: float
    population_density: float
    rainfall: float
    infrastructure_score: float


class ResourceRecommendation(BaseModel):
    ambulances: int
    rescue_teams: int
    relief_camps: int


class DisasterResponse(BaseModel):
    severity_level: str
    estimated_damage: float
    recommended_resources: ResourceRecommendation