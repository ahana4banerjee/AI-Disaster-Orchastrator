from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin
from app.models.schemas.resource import (
    ResourceInventory,
    ResourcePlanResponse,
)
from app.services.resource_engine import ResourceEngine, DEFAULT_EOC_INVENTORY
from app.core.websocket import manager

router = APIRouter()


async def _get_or_generate_plan(db, simulation_id: str) -> Dict[str, Any]:
    try:
        sim_oid = ObjectId(simulation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid simulation ObjectId string")

    plan = await db.resource_plans.find_one({"simulationId": simulation_id})
    if not plan:
        plan = await db.resource_plans.find_one({"simulationId": sim_oid})

    if plan:
        return plan

    # If simulation exists but has no resource plan yet, generate from its timesteps
    sim = await db.simulations.find_one({"_id": sim_oid})
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation run not found")

    generated = await ResourceEngine.recalculate_for_inventory(
        db, simulation_id, DEFAULT_EOC_INVENTORY
    )
    if not generated:
        raise HTTPException(status_code=404, detail="Unable to compute resource plan for simulation")
    return generated


@router.get("/inventory/default", response_model=ResourceInventory)
async def get_default_inventory(
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    doc = await db.resource_inventories.find_one({"isDefault": True})
    if doc and "inventory" in doc:
        return ResourceInventory(**doc["inventory"])
    return DEFAULT_EOC_INVENTORY


@router.put("/inventory/default", response_model=ResourceInventory)
async def update_default_inventory(
    payload: ResourceInventory,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    await db.resource_inventories.update_one(
        {"isDefault": True},
        {
            "$set": {
                "isDefault": True,
                "inventory": payload.model_dump(),
                "updatedBy": str(current_admin["_id"]),
                "updatedAt": datetime.utcnow(),
            }
        },
        upsert=True,
    )
    return payload


@router.get("/simulations/{simulation_id}", response_model=ResourcePlanResponse)
async def get_simulation_resource_plan(
    simulation_id: str,
    step: Optional[int] = Query(default=None, ge=0, le=4, description="Optional timestep index to inspect"),
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    plan = await _get_or_generate_plan(db, simulation_id)

    if step is not None:
        matched = next(
            (t for t in plan.get("timestepAssessments", []) if t.get("step") == step),
            None,
        )
        if not matched:
            raise HTTPException(
                status_code=404,
                detail=f"Resource assessment for timestep {step} not computed yet",
            )
        plan = dict(plan)
        plan["resources"] = matched["resources"]
        plan["summary"] = matched["summary"]
        plan["criticalAlerts"] = matched.get("criticalAlerts", [])
        plan["deficitAnalysisSummary"] = matched.get("deficitAnalysisSummary", "")

    return plan


@router.get("/simulations/{simulation_id}/deficits")
async def get_simulation_resource_deficits(
    simulation_id: str,
    step: Optional[int] = Query(default=None, ge=0, le=4),
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    plan = await _get_or_generate_plan(db, simulation_id)

    target = plan
    if step is not None:
        matched = next(
            (t for t in plan.get("timestepAssessments", []) if t.get("step") == step),
            None,
        )
        if not matched:
            raise HTTPException(
                status_code=404,
                detail=f"Resource assessment for timestep {step} not computed yet",
            )
        target = matched

    deficits = [r for r in target.get("resources", []) if r.get("deficit", 0) > 0]
    return {
        "simulationId": simulation_id,
        "step": step,
        "summary": target.get("summary", {}),
        "deficits": deficits,
        "criticalAlerts": target.get("criticalAlerts", []),
        "deficitAnalysisSummary": target.get("deficitAnalysisSummary", ""),
    }


@router.get("/simulations/{simulation_id}/summary")
async def get_simulation_resource_summary(
    simulation_id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    plan = await _get_or_generate_plan(db, simulation_id)
    return {
        "simulationId": simulation_id,
        "simulationName": plan.get("simulationName"),
        "status": plan.get("status", "In Progress"),
        "assessmentDate": plan.get("assessmentDate"),
        "inventory": plan.get("inventory"),
        "summary": plan.get("summary"),
        "resources": plan.get("resources", []),
        "criticalAlerts": plan.get("criticalAlerts", []),
        "deficitAnalysisSummary": plan.get("deficitAnalysisSummary", ""),
        "timestepsAssessed": len(plan.get("timestepAssessments", [])),
    }


@router.put("/simulations/{simulation_id}/inventory", response_model=ResourcePlanResponse)
async def update_simulation_inventory(
    simulation_id: str,
    payload: ResourceInventory,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        ObjectId(simulation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid simulation ObjectId string")

    updated_plan = await ResourceEngine.recalculate_for_inventory(db, simulation_id, payload)
    if not updated_plan:
        raise HTTPException(status_code=404, detail="Simulation run not found")

    try:
        await db.admin_audit_logs.insert_one({
            "adminUserId": ObjectId(str(current_admin["_id"])),
            "action": "UPDATE_RESOURCE_INVENTORY",
            "targetCollection": "resource_plans",
            "targetObjectId": ObjectId(simulation_id),
            "details": f"Updated available EOC inventory for simulation {simulation_id}",
            "timestamp": datetime.utcnow(),
        })
    except Exception:
        pass

    await manager.broadcast(
        simulation_id,
        {
            "type": "RESOURCE_UPDATE",
            "data": {
                "simulationId": simulation_id,
                "status": updated_plan.get("status"),
                "inventory": updated_plan.get("inventory"),
                "resources": updated_plan.get("resources"),
                "summary": updated_plan.get("summary"),
                "criticalAlerts": updated_plan.get("criticalAlerts"),
                "deficitAnalysisSummary": updated_plan.get("deficitAnalysisSummary"),
            },
        },
    )

    return updated_plan
