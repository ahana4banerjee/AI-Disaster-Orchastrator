from fastapi import APIRouter, HTTPException, Depends, status, Query, WebSocket, WebSocketDisconnect
from bson import ObjectId
from datetime import datetime
import asyncio
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin
from app.models.schemas.simulation import SimulationCreate, SimulationResponse, SimulationInitResponse

router = APIRouter()

def generate_timestep(step: int, scenario: dict) -> dict:
    mag = scenario.get("magnitude", 0.0)
    
    if step == 0:
        time_label = "Hour 0: Landfall"
        narrative = f"{scenario.get('disasterType')} onset triggered. Winds and initial structural impacts observed."
        casualties = int(mag * 0.05)
        displaced = int(mag * 500)
        struct_damage = min(90.0, mag * 0.1)
        infra = {
            "powerGrid": "Degraded",
            "transportationRoads": "Operational",
            "hospitals": "Operational"
        }
    elif step == 1:
        time_label = "Hour 12: Cascading Inundation"
        narrative = "Secondary cascading failures begin. Major transportation links impacted. Power grid failures spreading."
        casualties = int(mag * 0.15)
        displaced = int(mag * 1200)
        struct_damage = min(95.0, mag * 0.25)
        infra = {
            "powerGrid": "Failed",
            "transportationRoads": "Blocked",
            "hospitals": "Operational"
        }
    else:
        time_label = "Hour 24: Peak Strain"
        narrative = "Disaster intensity reaches peak levels. Critical stress on local medical infrastructure and emergency services."
        casualties = int(mag * 0.3)
        displaced = int(mag * 2000)
        struct_damage = min(100.0, mag * 0.4)
        infra = {
            "powerGrid": "Failed",
            "transportationRoads": "Blocked",
            "hospitals": "Critical Capacity"
        }
        
    return {
        "step": step,
        "timeLabel": time_label,
        "status": "Active",
        "narrative": narrative,
        "metrics": {
            "activeCasualties": max(1, casualties),
            "displacedPopulation": max(10, displaced),
            "structuralDamagePercentage": max(1.0, struct_damage)
        },
        "infrastructureStates": infra
    }

@router.post("/", response_model=SimulationInitResponse, status_code=status.HTTP_202_ACCEPTED)
async def initialize_simulation(
    payload: SimulationCreate,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        scen_id = ObjectId(payload.scenarioId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scenarioId ObjectId string")
        
    scenario = await db.scenarios.find_one({"_id": scen_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Associated scenario template not found")
        
    doc = {
        "scenarioId": payload.scenarioId,
        "name": payload.name,
        "createdBy": str(current_admin["_id"]),
        "status": "Initialized",
        "createdAt": datetime.utcnow(),
        "timesteps": []
    }
    
    try:
        result = await db.simulations.insert_one(doc)
        return {
            "simulationId": str(result.inserted_id),
            "status": "Initialized",
            "timestepsCount": 3
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database write error: {str(e)}")

@router.get("/{id}", response_model=SimulationResponse)
async def get_simulation_status(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        sim_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid simulation ObjectId string")
        
    simulation = await db.simulations.find_one({"_id": sim_id})
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation run not found")
        
    return simulation

@router.websocket("/{id}/ws")
async def simulation_ws_progress(
    websocket: WebSocket,
    id: str,
    token: str = Query(None),
    db = Depends(get_db)
):
    await websocket.accept()
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access token missing")
        return
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        user = await db.users.find_one({"email": email})
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User unauthorized")
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return
        
    try:
        sim_id = ObjectId(id)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid simulation ID")
        return
        
    simulation = await db.simulations.find_one({"_id": sim_id})
    if not simulation:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Simulation run not found")
        return
        
    scenario = await db.scenarios.find_one({"_id": ObjectId(simulation["scenarioId"])})
    if not scenario:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Scenario not found")
        return

    # Update status to Running
    await db.simulations.update_one({"_id": sim_id}, {"$set": {"status": "Running"}})

    try:
        for step in range(3):
            # Simulate processing delay
            await asyncio.sleep(0.5)
            
            step_doc = generate_timestep(step, scenario)
            
            # Save timestep to database
            await db.simulations.update_one(
                {"_id": sim_id},
                {"$push": {"timesteps": step_doc}}
            )
            
            # Send status update message
            await websocket.send_json({
                "type": "TIMESTEP_UPDATE",
                "data": {
                    "step": step_doc["step"],
                    "timeLabel": step_doc["timeLabel"],
                    "infrastructureStates": step_doc["infrastructureStates"]
                }
            })
            
        # Update simulation status to Completed
        await db.simulations.update_one({"_id": sim_id}, {"$set": {"status": "Completed"}})
        await websocket.send_json({
            "type": "SIMULATION_COMPLETED",
            "data": {
                "simulationId": id,
                "status": "Completed"
            }
        })
    except WebSocketDisconnect:
        # Gracefully handle client closing connection early
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "ERROR", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
