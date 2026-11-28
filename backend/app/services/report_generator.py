import csv
import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from xml.sax.saxutils import escape as xml_escape

from app.services.data_pipeline import DisasterDataPipeline

EXPECTED_TIMESTEPS = [
    (0, 0, "Hour 0: Landfall"),
    (1, 6, "Hour 6: Primary Grid Cascades"),
    (2, 12, "Hour 12: Transportation Corridors"),
    (3, 24, "Hour 24: Healthcare Stress"),
    (4, 48, "Hour 48: Recovery Thresholds"),
]

STEP_TO_HOUR = {step: hour for step, hour, _ in EXPECTED_TIMESTEPS}

SEVERITY_HEX = {
    "Low": "#10B981",
    "Medium": "#F59E0B",
    "High": "#F97316",
    "Extreme": "#DC2626",
    "Critical": "#991B1B",
}


class _NumberedCanvas(canvas.Canvas):
    """Two-pass ReportLab canvas to render accurate 'Page X of Y' footers."""

    def __init__(self, *args, report_code: str = "", classification: str = "", **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[dict] = []
        self._report_code = report_code
        self._classification = classification

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(num_pages)
            super().showPage()
        super().save()

    def _draw_footer(self, page_count: int):
        self.saveState()
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(0.65 * inch, 0.55 * inch, LETTER[0] - 0.65 * inch, 0.55 * inch)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(
            0.65 * inch,
            0.38 * inch,
            f"{self._classification}  |  REF: {self._report_code}",
        )
        self.drawRightString(
            LETTER[0] - 0.65 * inch,
            0.38 * inch,
            f"Page {self._pageNumber} of {page_count}",
        )
        self.restoreState()


class ReportGenerator:
    """
    Compiles validated immutable simulation snapshots and renders
    Markdown, multi-page EOC PDF, and structured CSV exports from the same snapshot.
    """

    @staticmethod
    def sanitize_text(value: Optional[str], max_len: int = 200) -> str:
        if not value:
            return ""
        cleaned = re.sub(r"<[^>]+>", "", str(value))
        cleaned = re.sub(r"[\x00-\x1f\x7f]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned[:max_len]

    @staticmethod
    def sanitize_filename(value: str, fallback: str = "sitrep") -> str:
        cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", str(value or "")).strip("_")
        return cleaned[:80] or fallback

    @staticmethod
    def _iso_str(val: Any) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, datetime):
            if val.tzinfo is None:
                val = val.replace(tzinfo=timezone.utc)
            return val.isoformat()
        return str(val)

    @staticmethod
    def compile_snapshot(
        simulation: Dict[str, Any],
        scenario: Optional[Dict[str, Any]],
        resource_plan: Optional[Dict[str, Any]],
        compiled_by: str,
        compiled_by_email: str,
        version: int,
        title: str,
        classification: str = "UNCLASSIFIED // EOC OFFICIAL BRIEF",
        author_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        sim_id = str(simulation.get("_id", ""))
        sim_name = ReportGenerator.sanitize_text(simulation.get("name", "Simulation Exercise"), 200)
        sim_status = simulation.get("status", "Created")
        source_updated = ReportGenerator._iso_str(
            simulation.get("updatedAt") or simulation.get("createdAt")
        )

        clean_title = ReportGenerator.sanitize_text(title, 200) or f"SITREP - {sim_name}"
        clean_classification = ReportGenerator.sanitize_text(classification, 100) or "UNCLASSIFIED // EOC OFFICIAL BRIEF"
        clean_notes = ReportGenerator.sanitize_text(author_notes, 2000) if author_notes else None

        sim_suffix = re.sub(r"[^A-Za-z0-9]", "", sim_id[-4:]).upper() or "0000"
        report_code = f"SITREP-{now.strftime('%Y%m%d')}-{sim_suffix}-V{version:02d}"

        scenario_missing = scenario is None
        if scenario:
            scenario_summary = {
                "name": ReportGenerator.sanitize_text(scenario.get("name", "Unnamed Scenario"), 200),
                "disasterType": scenario.get("disasterType", "Unknown"),
                "disasterSubtype": scenario.get("disasterSubtype", ""),
                "country": scenario.get("country", "Unknown"),
                "region": scenario.get("region", ""),
                "magnitude": scenario.get("magnitude", 0.0),
                "magnitudeScale": scenario.get("magnitudeScale", ""),
            }
        else:
            scenario_summary = {
                "name": "Archived / Missing Scenario",
                "disasterType": "Unknown",
                "disasterSubtype": "",
                "country": "Unknown",
                "region": "",
                "magnitude": 0.0,
                "magnitudeScale": "",
            }

        # Only include timesteps that actually exist; never fabricate pending hours
        raw_timesteps = sorted(simulation.get("timesteps", []), key=lambda t: t.get("step", 0))
        executed_steps_map = {int(t.get("step", -1)): t for t in raw_timesteps}

        executed_timesteps: List[Dict[str, Any]] = []
        pending_timesteps: List[Dict[str, Any]] = []
        recovery_days: Optional[int] = None

        for step_idx, hour, default_label in EXPECTED_TIMESTEPS:
            if step_idx in executed_steps_map:
                ts = executed_steps_map[step_idx]
                metrics = ts.get("metrics", {})
                if metrics.get("recoveryForecastDays") is not None:
                    recovery_days = int(metrics["recoveryForecastDays"])
                executed_timesteps.append({
                    "step": step_idx,
                    "hour": hour,
                    "timeLabel": ts.get("timeLabel", default_label),
                    "status": ts.get("status", "Active"),
                    "narrative": ts.get("narrative", ""),
                    "metrics": {
                        "activeCasualties": int(metrics.get("activeCasualties", 0)),
                        "displacedPopulation": int(metrics.get("displacedPopulation", 0)),
                        "structuralDamagePercentage": float(metrics.get("structuralDamagePercentage", 0.0)),
                        "recoveryForecastDays": metrics.get("recoveryForecastDays"),
                    },
                    "infrastructureStates": ts.get("infrastructureStates", []),
                })
            else:
                pending_timesteps.append({
                    "step": step_idx,
                    "hour": hour,
                    "timeLabel": default_label,
                    "status": "Not yet executed / Unavailable",
                })

        # Derive severity from latest executed timestep
        severity_class = "Low"
        latest_metrics = {}
        latest_infra: List[Dict[str, Any]] = []
        if executed_timesteps:
            latest = executed_timesteps[-1]
            latest_metrics = latest.get("metrics", {})
            latest_infra = latest.get("infrastructureStates", [])
            deaths = latest_metrics.get("activeCasualties", 0)
            affected = latest_metrics.get("displacedPopulation", 0)
            damage_pct = latest_metrics.get("structuralDamagePercentage", 0.0)
            mag = float(scenario_summary.get("magnitude") or 50.0)
            damage_thousands = max(10.0, damage_pct * mag * 5.0)
            _, severity_class = DisasterDataPipeline().calculate_severity(deaths, affected, damage_thousands)

        # Resource plan provenance (distinguish Missing vs Available Zero Deficits vs Available Deficits)
        if resource_plan is None:
            resource_plan_status = "Missing"
            resource_summary = None
            resources_list: List[Dict[str, Any]] = []
            critical_alerts: List[Dict[str, Any]] = []
            inventory = None
            deficit_summary_text = (
                "No resource_plans record was found for this simulation. "
                "Run or refresh the Resource Planning Engine to compute stockpile deficits."
            )
        else:
            resource_summary = resource_plan.get("summary", {})
            resources_list = resource_plan.get("resources", [])
            critical_alerts = resource_plan.get("criticalAlerts", [])
            inventory = resource_plan.get("inventory")
            total_def = int(resource_summary.get("totalDeficit", 0))
            resource_plan_status = "Available (Zero Deficits)" if total_def == 0 else "Available"
            deficit_summary_text = resource_plan.get("deficitAnalysisSummary", "")

        # Compile structured narrative sections
        narratives = [t["narrative"] for t in executed_timesteps if t.get("narrative")]
        if executed_timesteps:
            situation_summary = (
                f"Simulation '{sim_name}' ({scenario_summary['disasterType']} in "
                f"{scenario_summary['country']}"
                f"{', ' + scenario_summary['region'] if scenario_summary['region'] else ''}) "
                f"is currently in '{sim_status}' state with {len(executed_timesteps)} of {len(EXPECTED_TIMESTEPS)} "
                f"temporal steps executed. " + (" ".join(narratives) if narratives else "")
            ).strip()
        else:
            situation_summary = (
                f"Simulation '{sim_name}' is currently '{sim_status}' with 0 executed timesteps. "
                "No landfall or cascading metrics have been computed yet."
            )

        failed_infra = [
            f"{i['name']} ({i['status']})"
            for i in latest_infra
            if i.get("status") in ("Failed", "Critical", "Degraded")
        ]
        risk_assessment = (
            f"Derived Severity Classification: {severity_class}. "
            + (
                f"Impacted infrastructure lifelines at latest executed step: {', '.join(failed_infra)}."
                if failed_infra
                else "No degraded or failed infrastructure lifelines recorded at current step."
            )
        )
        if pending_timesteps:
            pending_labels = ", ".join(f"Hour {p['hour']}" for p in pending_timesteps)
            risk_assessment += f" Pending/unexecuted timesteps ({pending_labels}) are excluded from impact totals."

        if executed_timesteps:
            expected_impact = (
                f"Latest Executed Step ({executed_timesteps[-1]['timeLabel']}): "
                f"{latest_metrics.get('activeCasualties', 0):,} active casualties, "
                f"{latest_metrics.get('displacedPopulation', 0):,} displaced population, "
                f"{latest_metrics.get('structuralDamagePercentage', 0.0):.1f}% structural damage."
                + (
                    f" KNN historical analog restoration forecast: {recovery_days} days."
                    if recovery_days is not None
                    else ""
                )
            )
        else:
            expected_impact = "No impact metrics available yet (simulation has not reached Hour 0)."

        concerns: List[str] = []
        if scenario_missing:
            concerns.append("Source scenario template was missing/archived at report compilation time.")
        if resource_plan_status == "Missing":
            concerns.append("Resource plan has not been computed for this simulation; stockpile deficits are unknown.")
        if pending_timesteps:
            concerns.append(
                f"Simulation is incomplete ({sim_status}); {len(pending_timesteps)} future timestep(s) are pending."
            )
        for alert in critical_alerts:
            driver = f" [Driver: {alert['infrastructureDriver']}]" if alert.get("infrastructureDriver") else ""
            concerns.append(
                f"CRITICAL SHORTAGE — {alert['resourceType']}: deficit of {alert['deficit']:,} "
                f"({alert['deficitPercentage']}% short). {alert['implication']}{driver}"
            )
        if not concerns:
            concerns.append("No critical resource shortages or missing data flags identified.")

        actions: List[str] = []
        if critical_alerts:
            for alert in critical_alerts:
                actions.append(f"Mobilize mutual-aid {alert['resourceType']} (+{alert['deficit']:,}) — {alert['implication']}")
        if any(i.get("name") == "Road Network" and i.get("status") in ("Failed", "Critical") for i in latest_infra):
            actions.append("Establish alternate air/coastal logistics corridors to bypass blocked Road Network arteries.")
        if any(i.get("name") == "Hospitals" and i.get("status") in ("Failed", "Critical") for i in latest_infra):
            actions.append("Deploy mobile field triage units and backup power to relieve overloaded Hospitals.")
        if pending_timesteps:
            actions.append("Continue temporal simulation progression to evaluate downstream Hour 12–48 cascades.")
        if not actions:
            actions.append("Maintain standard EOC monitoring posture and verify regional depot readiness.")

        provenance = {
            "historicalDataSource": "EM-DAT Global Disaster Database (2000–2026, 16,789 cleaned records) & K-Means regional_risk_clusters.",
            "mlModels": [
                "DerivedSeverityClassifier (multi-output XGBoost log-scale regressors + dynamic percentile thresholds)",
                "Cosine Similarity KNN (5 nearest historical disaster analogs for decay & recovery estimation)",
                "K-Means Regional Vulnerability Clustering (K=4 ordinal risk tiers)",
            ],
            "simulationEngine": "TimelineEngine & CascadeRulesEngine deterministic temporal propagation (Hour 0, 6, 12, 24, 48).",
            "resourceEngine": "ResourceEngine (ML_DESIGN.md Section 15 linear/clipping formulas + infrastructure disruption modifiers vs. EOC inventory).",
            "recommendationMethod": "Deterministic rule-based operational directives (no external LLM API used).",
            "assumptions": [
                "Conditional impact estimation given scenario parameters; not a live meteorological forecast.",
                "Homeless population approximated at 25% of displaced population where not separately reported.",
            ],
            "limitations": [
                "EM-DAT historical economic damage (~80.3% missing) and magnitude (~79.8% missing) rely on imputation.",
                "Incomplete simulations reflect only executed timesteps; unexecuted hours are marked pending.",
            ],
            "generatedAt": now_iso,
        }

        return {
            "reportCode": report_code,
            "version": version,
            "title": clean_title,
            "classification": clean_classification,
            "generatedAt": now_iso,
            "compiledBy": compiled_by,
            "compiledByEmail": compiled_by_email,
            "simulationId": sim_id,
            "simulationName": sim_name,
            "simulationStatus": sim_status,
            "sourceSimulationUpdatedAt": source_updated,
            "severityClass": severity_class,
            "scenarioSummary": scenario_summary,
            "scenarioMissing": scenario_missing,
            "executedTimesteps": executed_timesteps,
            "pendingTimesteps": pending_timesteps,
            "resourcePlanStatus": resource_plan_status,
            "resourceSummary": resource_summary,
            "resources": resources_list,
            "criticalAlerts": critical_alerts,
            "inventory": inventory,
            "recoveryForecastDays": recovery_days,
            "authorNotes": clean_notes,
            "sections": {
                "situationSummary": situation_summary,
                "riskAssessment": risk_assessment,
                "expectedImpact": expected_impact,
                "resourceRecommendations": deficit_summary_text,
                "keyConcerns": " | ".join(concerns),
                "suggestedActions": " | ".join(actions),
            },
            "provenance": provenance,
        }

    @staticmethod
    def render_markdown(snapshot: Dict[str, Any]) -> str:
        lines: List[str] = []
        scen = snapshot.get("scenarioSummary", {})
        secs = snapshot.get("sections", {})
        prov = snapshot.get("provenance", {})

        lines.append(f"# {snapshot['title']}")
        lines.append(f"**Classification:** `{snapshot['classification']}`  ")
        lines.append(f"**Report Reference:** `{snapshot['reportCode']}` (Version {snapshot['version']})  ")
        lines.append(f"**Generated At:** {snapshot['generatedAt']}  ")
        lines.append(f"**Compiled By:** {snapshot['compiledByEmail']}  ")
        lines.append(f"**Simulation:** {snapshot['simulationName']} | **Status:** `{snapshot['simulationStatus']}` | **Severity:** `{snapshot['severityClass']}`  ")
        if snapshot.get("sourceSimulationUpdatedAt"):
            lines.append(f"**Source Simulation Updated At:** {snapshot['sourceSimulationUpdatedAt']}  ")
        lines.append("")

        if snapshot.get("authorNotes"):
            lines.append(f"> **Coordinator Notes:** {snapshot['authorNotes']}")
            lines.append("")

        lines.append("## 1. Situation Summary")
        lines.append(secs.get("situationSummary", ""))
        lines.append("")
        lines.append(
            f"- **Disaster Type:** {scen.get('disasterType')} ({scen.get('disasterSubtype') or 'General'})"
        )
        lines.append(f"- **Location:** {scen.get('country')}{', ' + scen.get('region') if scen.get('region') else ''}")
        lines.append(f"- **Magnitude:** {scen.get('magnitude')} {scen.get('magnitudeScale', '')}".strip())
        if snapshot.get("scenarioMissing"):
            lines.append("- **Warning:** Source scenario template was missing/archived at generation time.")
        lines.append("")

        lines.append("## 2. Risk Assessment & Cascading Timeline")
        lines.append(secs.get("riskAssessment", ""))
        lines.append("")
        lines.append(f"**Expected Impact:** {secs.get('expectedImpact', '')}")
        lines.append("")

        executed = snapshot.get("executedTimesteps", [])
        if executed:
            lines.append("| Step | Hour | Phase | Casualties | Displaced | Structural Damage % | Degraded/Failed Infra |")
            lines.append("| :--- | :---: | :--- | ---: | ---: | ---: | :--- |")
            for ts in executed:
                m = ts.get("metrics", {})
                bad_infra = [
                    f"{i['name']} ({i['status']})"
                    for i in ts.get("infrastructureStates", [])
                    if i.get("status") in ("Degraded", "Critical", "Failed")
                ]
                lines.append(
                    f"| {ts['step']} | H{ts['hour']} | {ts['timeLabel']} | "
                    f"{m.get('activeCasualties', 0):,} | {m.get('displacedPopulation', 0):,} | "
                    f"{m.get('structuralDamagePercentage', 0.0):.1f}% | "
                    f"{', '.join(bad_infra) if bad_infra else 'All Operational'} |"
                )
            lines.append("")

        pending = snapshot.get("pendingTimesteps", [])
        if pending:
            lines.append("### Pending / Unexecuted Timesteps")
            for p in pending:
                lines.append(f"- **{p['timeLabel']} (Hour {p['hour']}):** *{p['status']}*")
            lines.append("")

        lines.append("## 3. Resource Recommendations & Stockpile Deficits")
        lines.append(f"**Resource Plan Status:** `{snapshot.get('resourcePlanStatus', 'Missing')}`  ")
        lines.append(secs.get("resourceRecommendations", ""))
        lines.append("")

        resources = snapshot.get("resources", [])
        if resources:
            lines.append("| Resource | Required | Available | Deficit | Deficit % | Status | Infrastructure Factor |")
            lines.append("| :--- | ---: | ---: | ---: | ---: | :--- | :--- |")
            for r in resources:
                lines.append(
                    f"| {r['type']} | {r['required']:,} | {r['available']:,} | "
                    f"{r['deficit']:,} | {r['deficitPercentage']:.1f}% | "
                    f"{r['status']} ({r['statusColor']}) | {r.get('infrastructureFactor') or '—'} |"
                )
            lines.append("")

        lines.append("## 4. Key Concerns")
        for item in secs.get("keyConcerns", "").split(" | "):
            if item.strip():
                lines.append(f"- {item.strip()}")
        lines.append("")

        lines.append("## 5. Suggested Tactical Actions")
        for idx, item in enumerate(secs.get("suggestedActions", "").split(" | "), start=1):
            if item.strip():
                lines.append(f"{idx}. {item.strip()}")
        lines.append("")

        lines.append("## 6. Methodology & Data Sources (AI Transparency)")
        lines.append(f"- **Historical Data:** {prov.get('historicalDataSource', '')}")
        lines.append(f"- **ML Models:** {'; '.join(prov.get('mlModels', []))}")
        lines.append(f"- **Simulation Engine:** {prov.get('simulationEngine', '')}")
        lines.append(f"- **Resource Engine:** {prov.get('resourceEngine', '')}")
        lines.append(f"- **Recommendations:** {prov.get('recommendationMethod', '')}")
        lines.append(f"- **Assumptions:** {'; '.join(prov.get('assumptions', []))}")
        lines.append(f"- **Limitations:** {'; '.join(prov.get('limitations', []))}")
        lines.append(f"- **Provenance Timestamp:** {prov.get('generatedAt', '')}")
        lines.append("")

        return "\n".join(lines)

    @staticmethod
    def render_csv(snapshot: Dict[str, Any]) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Section", "StepOrKey", "Label", "ValueOrRequired", "Available", "Deficit", "Status", "Details"])

        # Metadata rows
        writer.writerow(["Metadata", "reportCode", "Report Code", snapshot["reportCode"], "", "", snapshot["simulationStatus"], snapshot["classification"]])
        writer.writerow(["Metadata", "version", "Version", snapshot["version"], "", "", snapshot["severityClass"], snapshot["generatedAt"]])
        writer.writerow(["Metadata", "simulationName", "Simulation Name", snapshot["simulationName"], "", "", snapshot["simulationStatus"], f"Compiled by {snapshot['compiledByEmail']}"])
        writer.writerow(["Metadata", "resourcePlanStatus", "Resource Plan Status", snapshot.get("resourcePlanStatus", "Missing"), "", "", "", ""])

        # Executed timelines & infrastructure
        for ts in snapshot.get("executedTimesteps", []):
            m = ts.get("metrics", {})
            writer.writerow([
                "Timeline",
                f"H{ts['hour']}",
                ts["timeLabel"],
                m.get("activeCasualties", 0),
                m.get("displacedPopulation", 0),
                f"{m.get('structuralDamagePercentage', 0.0):.1f}%",
                ts.get("status", "Active"),
                ts.get("narrative", ""),
            ])
            for inf in ts.get("infrastructureStates", []):
                writer.writerow([
                    "Infrastructure",
                    f"H{ts['hour']}",
                    inf.get("name", ""),
                    "",
                    "",
                    "",
                    inf.get("status", ""),
                    inf.get("details", ""),
                ])

        for p in snapshot.get("pendingTimesteps", []):
            writer.writerow(["Timeline", f"H{p['hour']}", p["timeLabel"], "", "", "", p["status"], "Unexecuted future timestep"])

        # Resources
        for r in snapshot.get("resources", []):
            writer.writerow([
                "Resource",
                r.get("key", ""),
                r.get("type", ""),
                r.get("required", 0),
                r.get("available", 0),
                r.get("deficit", 0),
                f"{r.get('status', '')} ({r.get('statusColor', '')})",
                r.get("infrastructureFactor") or r.get("operationalImplication", ""),
            ])

        return buf.getvalue()

    @staticmethod
    def render_pdf_bytes(snapshot: Dict[str, Any]) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=LETTER,
            leftMargin=0.65 * inch,
            rightMargin=0.65 * inch,
            topMargin=0.65 * inch,
            bottomMargin=0.75 * inch,
            title=snapshot["title"],
            author=snapshot["compiledByEmail"],
        )

        styles = getSampleStyleSheet()
        h1_style = ParagraphStyle(
            "EOCH1",
            parent=styles["Heading1"],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=12,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "EOCBody",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#1E293B"),
            spaceAfter=5,
        )
        cell_style = ParagraphStyle(
            "EOCCell",
            parent=styles["Normal"],
            fontSize=8,
            leading=10.5,
            textColor=colors.HexColor("#0F172A"),
        )
        cell_header_style = ParagraphStyle(
            "EOCCellHeader",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.white,
            fontName="Helvetica-Bold",
        )

        story: List[Any] = []
        sev_hex = SEVERITY_HEX.get(snapshot.get("severityClass", "Low"), "#10B981")

        # EOC Official Header Banner
        banner_data = [
            [
                Paragraph(
                    f"<b>{xml_escape(snapshot['classification'])}</b><br/>"
                    f"<font size='14'><b>{xml_escape(snapshot['title'])}</b></font><br/>"
                    f"<font size='8' color='#CBD5E1'>REF: {xml_escape(snapshot['reportCode'])}  |  "
                    f"VERSION {snapshot['version']}  |  GENERATED: {xml_escape(snapshot['generatedAt'])}</font>",
                    ParagraphStyle("Banner", fontSize=9, leading=14, textColor=colors.white),
                )
            ]
        ]
        banner_tbl = Table(banner_data, colWidths=[7.2 * inch])
        banner_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("PADDING", (0, 0), (-1, -1), 12),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#334155")),
            ])
        )
        story.append(banner_tbl)
        story.append(Spacer(1, 10))

        # Metadata Grid
        scen = snapshot.get("scenarioSummary", {})
        meta_rows = [
            [
                Paragraph("<b>Simulation</b>", cell_style),
                Paragraph(xml_escape(snapshot["simulationName"]), cell_style),
                Paragraph("<b>Sim Status</b>", cell_style),
                Paragraph(xml_escape(snapshot["simulationStatus"]), cell_style),
            ],
            [
                Paragraph("<b>Hazard / Location</b>", cell_style),
                Paragraph(
                    xml_escape(f"{scen.get('disasterType')} — {scen.get('country')} ({scen.get('magnitude')} {scen.get('magnitudeScale', '')})"),
                    cell_style,
                ),
                Paragraph("<b>Severity</b>", cell_style),
                Paragraph(f"<b><font color='{sev_hex}'>{xml_escape(snapshot['severityClass'])}</font></b>", cell_style),
            ],
            [
                Paragraph("<b>Compiled By</b>", cell_style),
                Paragraph(xml_escape(snapshot["compiledByEmail"]), cell_style),
                Paragraph("<b>Resource Plan</b>", cell_style),
                Paragraph(xml_escape(snapshot.get("resourcePlanStatus", "Missing")), cell_style),
            ],
        ]
        meta_tbl = Table(meta_rows, colWidths=[1.2 * inch, 2.6 * inch, 1.2 * inch, 2.2 * inch])
        meta_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        story.append(meta_tbl)
        story.append(Spacer(1, 10))

        # Table of Contents (structured section index)
        toc_rows = [
            [Paragraph("Table of Contents", cell_header_style), Paragraph("Coverage", cell_header_style)],
            [Paragraph("1. Situation Summary & Coordinator Notes", cell_style), Paragraph("Incident context & hazard profile", cell_style)],
            [Paragraph("2. Risk Assessment & Cascading Timeline", cell_style), Paragraph(f"{len(snapshot.get('executedTimesteps', []))} executed, {len(snapshot.get('pendingTimesteps', []))} pending", cell_style)],
            [Paragraph("3. Resource Recommendations & Stockpile Deficits", cell_style), Paragraph(snapshot.get("resourcePlanStatus", "Missing"), cell_style)],
            [Paragraph("4. Key Concerns & Tactical Actions", cell_style), Paragraph(f"{len(snapshot.get('criticalAlerts', []))} critical alert(s)", cell_style)],
            [Paragraph("5. Methodology & Data Sources (AI Transparency)", cell_style), Paragraph("EM-DAT, ML models, simulation & resource provenance", cell_style)],
        ]
        toc_tbl = Table(toc_rows, colWidths=[3.8 * inch, 3.4 * inch], repeatRows=1)
        toc_tbl.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(toc_tbl)
        story.append(Spacer(1, 10))

        secs = snapshot.get("sections", {})

        # Section 1
        story.append(Paragraph("1. Situation Summary", h1_style))
        story.append(Paragraph(xml_escape(secs.get("situationSummary", "")), body_style))
        if snapshot.get("authorNotes"):
            story.append(Paragraph(f"<b>Coordinator Notes:</b> {xml_escape(snapshot['authorNotes'])}", body_style))

        # Section 2
        story.append(Paragraph("2. Risk Assessment & Cascading Timeline", h1_style))
        story.append(Paragraph(xml_escape(secs.get("riskAssessment", "")), body_style))
        story.append(Paragraph(f"<b>Expected Impact:</b> {xml_escape(secs.get('expectedImpact', ''))}", body_style))

        executed = snapshot.get("executedTimesteps", [])
        if executed:
            ts_rows = [[
                Paragraph("Hour", cell_header_style),
                Paragraph("Phase", cell_header_style),
                Paragraph("Casualties", cell_header_style),
                Paragraph("Displaced", cell_header_style),
                Paragraph("Damage %", cell_header_style),
                Paragraph("Degraded / Failed Lifelines", cell_header_style),
            ]]
            for ts in executed:
                m = ts.get("metrics", {})
                bad = [
                    f"{i['name']} ({i['status']})"
                    for i in ts.get("infrastructureStates", [])
                    if i.get("status") in ("Degraded", "Critical", "Failed")
                ]
                ts_rows.append([
                    Paragraph(f"H{ts['hour']}", cell_style),
                    Paragraph(xml_escape(ts["timeLabel"]), cell_style),
                    Paragraph(f"{m.get('activeCasualties', 0):,}", cell_style),
                    Paragraph(f"{m.get('displacedPopulation', 0):,}", cell_style),
                    Paragraph(f"{m.get('structuralDamagePercentage', 0.0):.1f}%", cell_style),
                    Paragraph(xml_escape(", ".join(bad) if bad else "All Operational"), cell_style),
                ])
            ts_tbl = Table(
                ts_rows,
                colWidths=[0.55 * inch, 1.75 * inch, 0.8 * inch, 0.9 * inch, 0.75 * inch, 2.45 * inch],
                repeatRows=1,
            )
            ts_tbl.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ])
            )
            story.append(Spacer(1, 6))
            story.append(ts_tbl)

        pending = snapshot.get("pendingTimesteps", [])
        if pending:
            pending_str = ", ".join(f"{p['timeLabel']} ({p['status']})" for p in pending)
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"<b>Pending Timesteps:</b> {xml_escape(pending_str)}", body_style))

        # Section 3
        story.append(Paragraph("3. Resource Recommendations & Stockpile Deficits", h1_style))
        story.append(
            Paragraph(
                f"<b>Resource Plan Status:</b> {xml_escape(snapshot.get('resourcePlanStatus', 'Missing'))} — "
                f"{xml_escape(secs.get('resourceRecommendations', ''))}",
                body_style,
            )
        )
        resources = snapshot.get("resources", [])
        if resources:
            res_rows = [[
                Paragraph("Resource", cell_header_style),
                Paragraph("Required", cell_header_style),
                Paragraph("Available", cell_header_style),
                Paragraph("Deficit", cell_header_style),
                Paragraph("Status", cell_header_style),
                Paragraph("Infrastructure Driver", cell_header_style),
            ]]
            for r in resources:
                st_color = "#10B981" if r["statusColor"] == "EMERALD" else "#F59E0B" if r["statusColor"] == "AMBER" else "#DC2626"
                res_rows.append([
                    Paragraph(xml_escape(r["type"]), cell_style),
                    Paragraph(f"{r['required']:,}", cell_style),
                    Paragraph(f"{r['available']:,}", cell_style),
                    Paragraph(f"{r['deficit']:,} ({r['deficitPercentage']:.1f}%)", cell_style),
                    Paragraph(f"<b><font color='{st_color}'>{xml_escape(r['status'])}</font></b>", cell_style),
                    Paragraph(xml_escape(r.get("infrastructureFactor") or "Baseline demand"), cell_style),
                ])
            res_tbl = Table(
                res_rows,
                colWidths=[1.15 * inch, 0.75 * inch, 0.75 * inch, 1.0 * inch, 1.25 * inch, 2.3 * inch],
                repeatRows=1,
            )
            res_tbl.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ])
            )
            story.append(Spacer(1, 6))
            story.append(res_tbl)

        # Section 4
        story.append(Paragraph("4. Key Concerns & Suggested Tactical Actions", h1_style))
        for item in secs.get("keyConcerns", "").split(" | "):
            if item.strip():
                story.append(Paragraph(f"&bull; {xml_escape(item.strip())}", body_style))
        story.append(Spacer(1, 4))
        for idx, item in enumerate(secs.get("suggestedActions", "").split(" | "), start=1):
            if item.strip():
                story.append(Paragraph(f"{idx}. {xml_escape(item.strip())}", body_style))

        # Section 5: Provenance & AI Transparency (on clean break if needed)
        story.append(PageBreak())
        story.append(Paragraph("5. Methodology & Data Sources (AI Transparency)", h1_style))
        prov = snapshot.get("provenance", {})
        prov_items = [
            ("Historical Data", prov.get("historicalDataSource", "")),
            ("ML Models", "; ".join(prov.get("mlModels", []))),
            ("Simulation Engine", prov.get("simulationEngine", "")),
            ("Resource Engine", prov.get("resourceEngine", "")),
            ("Recommendation Method", prov.get("recommendationMethod", "")),
            ("Assumptions", "; ".join(prov.get("assumptions", []))),
            ("Limitations", "; ".join(prov.get("limitations", []))),
            ("Provenance Timestamp", prov.get("generatedAt", "")),
        ]
        for label, val in prov_items:
            story.append(Paragraph(f"<b>{xml_escape(label)}:</b> {xml_escape(val)}", body_style))

        doc.build(
            story,
            canvasmaker=lambda *args, **kwargs: _NumberedCanvas(
                *args,
                report_code=snapshot["reportCode"],
                classification=snapshot["classification"],
                **kwargs,
            ),
        )
        return buf.getvalue()
