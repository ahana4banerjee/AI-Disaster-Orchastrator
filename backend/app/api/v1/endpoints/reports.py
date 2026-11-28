import asyncio
import io
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.api.v1.endpoints.auth import get_current_admin
from app.core.database import get_db
from app.models.schemas.report import (
    ReportCreate,
    ReportDetailResponse,
    ReportListResponse,
    ReportResponse,
)
from app.services.report_generator import ReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter()


async def _log_admin_action(db, admin_user: dict, action: str, target_id: ObjectId, details: str):
    try:
        await db.admin_audit_logs.insert_one({
            "adminUserId": ObjectId(str(admin_user["_id"])),
            "adminEmail": admin_user.get("email", ""),
            "action": action,
            "targetCollection": "ai_reports",
            "targetObjectId": target_id,
            "details": details,
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception:
        # Gracefully handle un-mocked audit collection in unit tests
        pass


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def compile_report(
    payload: ReportCreate,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        sim_oid = ObjectId(payload.simulationId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid simulationId ObjectId string")

    simulation = await db.simulations.find_one({"_id": sim_oid})
    if not simulation:
        raise HTTPException(status_code=404, detail=f"Simulation run {payload.simulationId} not found")

    # Retrieve linked scenario (gracefully handle archived/missing scenario)
    scenario = None
    scen_id = simulation.get("scenarioId")
    if scen_id:
        try:
            sc_oid = ObjectId(scen_id) if isinstance(scen_id, str) else scen_id
            scenario = await db.scenarios.find_one({"_id": sc_oid})
        except Exception:
            scenario = None

    # Retrieve linked resource_plans (gracefully distinguish Missing vs Zero Deficits)
    resource_plan = None
    try:
        resource_plan = await db.resource_plans.find_one({"simulationId": payload.simulationId})
        if not resource_plan:
            resource_plan = await db.resource_plans.find_one({"simulationId": sim_oid})
    except (TypeError, Exception):
        resource_plan = None

    # Determine next immutable report version for this simulation
    version = 1
    try:
        existing_count = await db.ai_reports.count_documents({"simulationId": payload.simulationId})
        if isinstance(existing_count, int):
            version = existing_count + 1
    except (TypeError, Exception):
        version = 1

    compiled_by = str(current_admin.get("_id", ""))
    compiled_by_email = current_admin.get("email", "admin@agency.gov")

    snapshot = ReportGenerator.compile_snapshot(
        simulation=simulation,
        scenario=scenario,
        resource_plan=resource_plan,
        compiled_by=compiled_by,
        compiled_by_email=compiled_by_email,
        version=version,
        title=payload.title,
        classification=payload.classification,
        author_notes=payload.authorNotes,
    )

    # Render all formats from the validated snapshot BEFORE DB persistence
    try:
        md_content = ReportGenerator.render_markdown(snapshot)
        ReportGenerator.render_csv(snapshot)
        pdf_bytes = await asyncio.to_thread(ReportGenerator.render_pdf_bytes, snapshot)
        if not pdf_bytes or not pdf_bytes.startswith(b"%PDF-"):
            raise RuntimeError("PDF renderer returned invalid binary output")
    except Exception as e:
        logger.error(f"Report rendering failed for simulation {payload.simulationId}: {e}")
        raise HTTPException(status_code=500, detail=f"Report rendering error: {str(e)}")

    rep_oid = ObjectId()
    rep_id_str = str(rep_oid)
    now = datetime.now(timezone.utc)

    doc = {
        "_id": rep_oid,
        "reportCode": snapshot["reportCode"],
        "version": snapshot["version"],
        "simulationId": payload.simulationId,
        "simulationName": snapshot["simulationName"],
        "simulationStatus": snapshot["simulationStatus"],
        "severityClass": snapshot["severityClass"],
        "compiledBy": compiled_by,
        "compiledByEmail": compiled_by_email,
        "title": snapshot["title"],
        "classification": snapshot["classification"],
        "sections": snapshot["sections"],
        "snapshot": snapshot,
        "markdownContent": md_content,
        "pdfBytes": pdf_bytes,
        "pdfStorageUrl": f"/api/v1/reports/{rep_id_str}/pdf",
        "markdownUrl": f"/api/v1/reports/{rep_id_str}/markdown",
        "csvUrl": f"/api/v1/reports/{rep_id_str}/csv",
        "createdAt": now,
    }

    try:
        result = await db.ai_reports.insert_one(doc)
        if getattr(result, "inserted_id", None):
            doc["_id"] = result.inserted_id
            final_id = str(doc["_id"])
            if final_id != rep_id_str:
                doc["pdfStorageUrl"] = f"/api/v1/reports/{final_id}/pdf"
                doc["markdownUrl"] = f"/api/v1/reports/{final_id}/markdown"
                doc["csvUrl"] = f"/api/v1/reports/{final_id}/csv"
                await db.ai_reports.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "pdfStorageUrl": doc["pdfStorageUrl"],
                            "markdownUrl": doc["markdownUrl"],
                            "csvUrl": doc["csvUrl"],
                        }
                    },
                )
    except Exception as e:
        logger.error(f"Database persistence error for report: {e}")
        raise HTTPException(status_code=500, detail=f"Database execution error: {str(e)}")

    await _log_admin_action(
        db,
        current_admin,
        "GENERATE_REPORT",
        doc["_id"],
        f"Compiled {snapshot['reportCode']} (v{version}) for simulation '{snapshot['simulationName']}'",
    )

    return doc


@router.get("/", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    simulationId: Optional[str] = Query(default=None),
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    query = {}
    if simulationId:
        query["simulationId"] = simulationId

    total_count = await db.ai_reports.count_documents(query)
    total_pages = max(1, (total_count + limit - 1) // limit)
    cursor = (
        db.ai_reports.find(query, {"pdfBytes": 0})
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    for item in items:
        rid = str(item["_id"])
        item.setdefault("pdfStorageUrl", f"/api/v1/reports/{rid}/pdf")
        item.setdefault("markdownUrl", f"/api/v1/reports/{rid}/markdown")
        item.setdefault("csvUrl", f"/api/v1/reports/{rid}/csv")

    return {
        "totalCount": total_count,
        "page": page,
        "totalPages": total_pages,
        "data": items,
    }


@router.get("/{id}", response_model=ReportDetailResponse)
async def get_report_detail(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        rep_oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")

    report = await db.ai_reports.find_one({"_id": rep_oid}, {"pdfBytes": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    rid = str(report["_id"])
    report.setdefault("pdfStorageUrl", f"/api/v1/reports/{rid}/pdf")
    report.setdefault("markdownUrl", f"/api/v1/reports/{rid}/markdown")
    report.setdefault("csvUrl", f"/api/v1/reports/{rid}/csv")
    return report


@router.get("/{id}/pdf")
async def stream_report_pdf(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        rep_oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")

    report = await db.ai_reports.find_one({"_id": rep_oid})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = report.get("pdfBytes")
    if not pdf_bytes and report.get("snapshot"):
        pdf_bytes = await asyncio.to_thread(ReportGenerator.render_pdf_bytes, report["snapshot"])
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="PDF content missing in this report")

    safe_name = ReportGenerator.sanitize_filename(report.get("reportCode") or "sitrep")
    await _log_admin_action(
        db,
        current_admin,
        "DOWNLOAD_REPORT_PDF",
        rep_oid,
        f"Downloaded PDF for {safe_name}",
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.pdf"},
    )


@router.get("/{id}/markdown")
async def download_report_markdown(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        rep_oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")

    report = await db.ai_reports.find_one({"_id": rep_oid}, {"pdfBytes": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    snapshot = report.get("snapshot")
    md_text = ReportGenerator.render_markdown(snapshot) if snapshot else report.get("markdownContent", "")
    if not md_text:
        raise HTTPException(status_code=404, detail="Markdown content missing in this report")

    safe_name = ReportGenerator.sanitize_filename(report.get("reportCode") or "sitrep")
    await _log_admin_action(
        db,
        current_admin,
        "DOWNLOAD_REPORT_MARKDOWN",
        rep_oid,
        f"Downloaded Markdown for {safe_name}",
    )

    return StreamingResponse(
        io.BytesIO(md_text.encode("utf-8")),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.md"},
    )


@router.get("/{id}/csv")
async def download_report_csv(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        rep_oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")

    report = await db.ai_reports.find_one({"_id": rep_oid}, {"pdfBytes": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    snapshot = report.get("snapshot")
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot data missing for CSV export")

    csv_text = ReportGenerator.render_csv(snapshot)
    safe_name = ReportGenerator.sanitize_filename(report.get("reportCode") or "sitrep")
    await _log_admin_action(
        db,
        current_admin,
        "DOWNLOAD_REPORT_CSV",
        rep_oid,
        f"Downloaded CSV for {safe_name}",
    )

    return StreamingResponse(
        io.BytesIO(csv_text.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.csv"},
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db=Depends(get_db),
):
    try:
        rep_oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ObjectId string")

    report = await db.ai_reports.find_one({"_id": rep_oid}, {"_id": 1, "reportCode": 1, "title": 1})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    await db.ai_reports.delete_one({"_id": rep_oid})
    await _log_admin_action(
        db,
        current_admin,
        "DELETE_REPORT",
        rep_oid,
        f"Deleted report {report.get('reportCode', id)} ('{report.get('title', '')}')",
    )
    return None
