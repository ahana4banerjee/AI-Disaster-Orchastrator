from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
import io
from bson import ObjectId
from datetime import datetime
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_admin
from app.models.schemas.report import ReportCreate, ReportResponse
from app.services.report_generator import ReportGenerator

router = APIRouter()

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def compile_report(
    payload: ReportCreate,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        sim_id = ObjectId(payload.simulationId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid simulationId ObjectId string")

    # Find target simulation
    simulation = await db.simulations.find_one({"_id": sim_id})
    if not simulation:
        raise HTTPException(status_code=404, detail=f"Simulation run {payload.simulationId} not found")

    # Generate markdown content
    md_content = ReportGenerator.compile_markdown_report(simulation)
    
    # Generate PDF bytes
    pdf_bytes = ReportGenerator.generate_pdf_bytes(md_content)
    
    # Prepare dummy sections based on narrative
    situation_summary = "Primary impact and cascading steps evaluated successfully."
    if simulation.get("timesteps"):
        narratives = [t.get("narrative") for t in simulation["timesteps"] if t.get("narrative")]
        if narratives:
            situation_summary = " ".join(narratives)

    doc = {
        "simulationId": payload.simulationId,
        "compiledBy": str(current_admin["_id"]),
        "title": payload.title,
        "sections": {
            "situationSummary": situation_summary,
            "riskAssessment": "Extreme threat level on infrastructure sectors.",
            "suggestedActions": "Re-allocate medical personnel and rescue teams to critical zones."
        },
        # Store PDF bytes directly in DB for streaming
        "pdfBytes": pdf_bytes,
        "createdAt": datetime.utcnow()
    }

    try:
        result = await db.ai_reports.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        # Add temporary relative storage url pointing to the download endpoint
        doc["pdfStorageUrl"] = f"/api/v1/reports/{doc['_id']}/pdf"
        
        # Update PDF storage URL in DB
        await db.ai_reports.update_one(
            {"_id": doc["_id"]},
            {"$set": {"pdfStorageUrl": doc["pdfStorageUrl"]}}
        )
        
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution error: {str(e)}")

@router.get("/{id}/pdf")
async def stream_report_pdf(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db = Depends(get_db)
):
    try:
        rep_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")
        
    report = await db.ai_reports.find_one({"_id": rep_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    pdf_bytes = report.get("pdfBytes")
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="PDF content missing in this report")
        
    # Return binary stream
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sitrep_{id}.pdf"}
    )
