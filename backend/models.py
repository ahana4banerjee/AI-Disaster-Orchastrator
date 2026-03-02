from sqlalchemy import Column, Integer, Float, String
from database import Base

class DisasterLog(Base):
    __tablename__ = "disaster_logs"

    id = Column(Integer, primary_key=True, index=True)
    disaster_type = Column(String, index=True)
    magnitude = Column(Float)
    population_density = Column(Float)
    rainfall = Column(Float)
    infrastructure_score = Column(Float)
    severity_level = Column(String)
    estimated_damage = Column(Float)
    ambulances = Column(Integer)
    rescue_teams = Column(Integer)
    relief_camps = Column(Integer)