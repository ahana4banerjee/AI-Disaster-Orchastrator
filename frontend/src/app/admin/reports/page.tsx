"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Code,
  Eye,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface ReportListItem {
  id?: string;
  _id?: string;
  reportCode?: string;
  version: number;
  simulationId: string;
  simulationName?: string;
  simulationStatus?: string;
  severityClass?: string;
  title: string;
  classification: string;
  compiledByEmail?: string;
  createdAt: string;
}

interface ReportDetail extends ReportListItem {
  snapshot?: {
    reportCode: string;
    version: number;
    title: string;
    classification: string;
    generatedAt: string;
    compiledByEmail: string;
    simulationName: string;
    simulationStatus: string;
    sourceSimulationUpdatedAt?: string | null;
    severityClass: string;
    scenarioSummary: {
      name: string;
      disasterType: string;
      disasterSubtype?: string;
      country: string;
      region?: string;
      magnitude: number;
      magnitudeScale?: string;
    };
    scenarioMissing?: boolean;
    executedTimesteps: Array<{
      step: number;
      hour: number;
      timeLabel: string;
      status: string;
      narrative: string;
      metrics: {
        activeCasualties: number;
        displacedPopulation: number;
        structuralDamagePercentage: number;
        recoveryForecastDays?: number | null;
      };
      infrastructureStates: Array<{ name: string; status: string; details?: string }>;
    }>;
    pendingTimesteps: Array<{
      step: number;
      hour: number;
      timeLabel: string;
      status: string;
    }>;
    resourcePlanStatus: string;
    resources: Array<{
      key: string;
      type: string;
      required: number;
      available: number;
      deficit: number;
      deficitPercentage: number;
      status: string;
      statusColor: string;
      infrastructureFactor?: string | null;
    }>;
    authorNotes?: string | null;
    sections: {
      situationSummary: string;
      riskAssessment: string;
      expectedImpact: string;
      resourceRecommendations: string;
      keyConcerns: string;
      suggestedActions: string;
    };
    provenance: {
      historicalDataSource: string;
      mlModels: string[];
      simulationEngine: string;
      resourceEngine: string;
      recommendationMethod: string;
      assumptions: string[];
      limitations: string[];
      generatedAt: string;
    };
  };
  markdownContent: string;
}

interface SimulationOption {
  id?: string;
  _id?: string;
  name: string;
  status: string;
}

function mapSeverityBadge(sev?: string): "low" | "moderate" | "high" | "extreme" | "critical" {
  const s = (sev || "low").toLowerCase();
  if (s === "medium" || s === "moderate") return "moderate";
  if (s === "high") return "high";
  if (s === "extreme") return "extreme";
  if (s === "critical") return "critical";
  return "low";
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const simIdParam = searchParams.get("simulationId");

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);

  const [simulations, setSimulations] = useState<SimulationOption[]>([]);
  const [showCompiler, setShowCompiler] = useState<boolean>(Boolean(simIdParam));
  const [compileSimId, setCompileSimId] = useState<string>(simIdParam || "");
  const [compileTitle, setCompileTitle] = useState<string>("");
  const [compileNotes, setCompileNotes] = useState<string>("");
  const [compiling, setCompiling] = useState(false);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "markdown">("preview");
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/reports/?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load compiled reports");
      const body = await res.json();
      const items: ReportListItem[] = body.data || [];
      setReports(items);
      if (items.length > 0 && !selectedReportId) {
        setSelectedReportId(items[0].id || items[0]._id || null);
      }
    } catch (err: any) {
      setError(err.message || "Unable to fetch reports.");
    } finally {
      setLoadingList(false);
    }
  }, [router, selectedReportId]);

  const fetchSimulations = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/simulations/?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        const sims: SimulationOption[] = body.data || [];
        setSimulations(sims);
        if (!compileSimId && sims.length > 0) {
          const firstId = sims[0].id || sims[0]._id || "";
          setCompileSimId(firstId);
          setCompileTitle(`SITREP - ${sims[0].name}`);
        } else if (simIdParam) {
          const matched = sims.find((s) => (s.id || s._id) === simIdParam);
          if (matched && !compileTitle) {
            setCompileTitle(`SITREP - ${matched.name}`);
          }
        }
      }
    } catch {
      // non-fatal
    }
  }, [compileSimId, simIdParam, compileTitle]);

  const fetchReportDetail = useCallback(
    async (reportId: string) => {
      setLoadingDetail(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load situation report details");
        const data: ReportDetail = await res.json();
        setDetail(data);
      } catch (err: any) {
        setError(err.message || "Failed to load report preview.");
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchReports();
    fetchSimulations();
  }, [fetchReports, fetchSimulations]);

  useEffect(() => {
    if (selectedReportId) {
      fetchReportDetail(selectedReportId);
    } else {
      setDetail(null);
    }
  }, [selectedReportId, fetchReportDetail]);

  const handleCompileReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compileSimId) {
      setError("Select a simulation run to compile a Situation Report.");
      return;
    }
    setCompiling(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/reports/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          simulationId: compileSimId,
          title: compileTitle.trim() || "EOC Situation Briefing",
          authorNotes: compileNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to compile Situation Report");
      }
      const created: ReportListItem = await res.json();
      const newId = created.id || created._id || null;
      setShowCompiler(false);
      setCompileNotes("");
      await fetchReports();
      if (newId) setSelectedReportId(newId);
    } catch (err: any) {
      setError(err.message || "Report compilation failed.");
    } finally {
      setCompiling(false);
    }
  };

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this compiled Situation Report?")) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://127.0.0.1:8000/api/v1/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete report");
      if (selectedReportId === reportId) {
        setSelectedReportId(null);
      }
      await fetchReports();
    } catch (err: any) {
      setError(err.message || "Error deleting report.");
    }
  };

  const handleDownload = async (format: "pdf" | "markdown" | "csv") => {
    if (!selectedReportId) return;
    setDownloadingFormat(format);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/reports/${selectedReportId}/${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Failed to export ${format.toUpperCase()}`);
      }
      const blob = await res.blob();
      const ext = format === "markdown" ? "md" : format;
      const code = detail?.snapshot?.reportCode || detail?.reportCode || "sitrep";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || `Export error (${format})`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const snap = detail?.snapshot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Situation Reports (SitReps)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Compile immutable EOC Situation Briefings from active or completed simulations and export PDF, Markdown, or CSV.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
          onClick={() => setShowCompiler((prev) => !prev)}
        >
          <Plus className="h-3.5 w-3.5" />
          {showCompiler ? "Close Compiler" : "Compile New SitRep"}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 text-xs text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block">Report Pipeline Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Compile New SitRep Panel */}
      {showCompiler && (
        <form
          onSubmit={handleCompileReport}
          className="bg-bg-secondary border border-accent-primary/30 rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <div className="border-b border-border-custom pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Compile Immutable Situation Report Snapshot
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Captures an immutable snapshot of executed timesteps, infrastructure states, and resource deficits.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                Source Simulation Run
              </label>
              <select
                required
                value={compileSimId}
                onChange={(e) => {
                  const sid = e.target.value;
                  setCompileSimId(sid);
                  const found = simulations.find((s) => (s.id || s._id) === sid);
                  if (found) setCompileTitle(`SITREP - ${found.name}`);
                }}
                className="w-full h-9 px-3 bg-bg-primary border border-border-custom rounded-lg text-xs text-text-primary focus:border-accent-primary focus:outline-hidden"
              >
                <option value="" disabled>
                  Select simulation...
                </option>
                {simulations.map((s) => {
                  const sid = s.id || s._id || "";
                  return (
                    <option key={sid} value={sid}>
                      {s.name} ({s.status})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                Report Title
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={compileTitle}
                onChange={(e) => setCompileTitle(e.target.value)}
                placeholder="e.g. SITREP - Cyclone Odisha Response"
                className="w-full h-9 px-3 bg-bg-primary border border-border-custom rounded-lg text-xs text-text-primary focus:border-accent-primary focus:outline-hidden"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Coordinator Notes (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={compileNotes}
              onChange={(e) => setCompileNotes(e.target.value)}
              placeholder="Optional operational remarks for command staff..."
              className="w-full p-3 bg-bg-primary border border-border-custom rounded-lg text-xs text-text-primary focus:border-accent-primary focus:outline-hidden"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCompiler(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={compiling}>
              {compiling ? "Compiling Snapshot & PDF..." : "Compile & Persist Report"}
            </Button>
          </div>
        </form>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Compiled Briefings List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Compiled Briefings ({reports.length})
          </h3>

          {loadingList ? (
            <div className="bg-bg-secondary border border-border-custom rounded-xl p-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 text-accent-primary animate-spin" />
              <span className="text-xs font-mono text-text-secondary">Loading SitReps...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-bg-secondary border border-border-custom rounded-xl p-6 text-center space-y-2">
              <FileText className="h-8 w-8 text-text-muted mx-auto" />
              <p className="text-xs text-text-secondary">
                No compiled reports yet. Click <b>Compile New SitRep</b> to generate your first briefing.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1 scrollbar-thin">
              {reports.map((report) => {
                const rid = report.id || report._id || "";
                const isSelected = selectedReportId === rid;
                return (
                  <div
                    key={rid}
                    onClick={() => setSelectedReportId(rid)}
                    className={`w-full text-left bg-bg-secondary border p-4 rounded-xl shadow-xs transition select-none cursor-pointer flex flex-col justify-between min-h-[105px] ${
                      isSelected
                        ? "border-accent-primary ring-1 ring-accent-primary/20"
                        : "border-border-custom hover:bg-bg-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold font-mono text-text-muted truncate">
                        {report.reportCode || rid.slice(-8).toUpperCase()} &bull; v{report.version}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={mapSeverityBadge(report.severityClass)} />
                        <button
                          onClick={(e) => handleDeleteReport(rid, e)}
                          title="Delete Report"
                          className="p-1 text-text-muted hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary mt-2 line-clamp-2">
                      {report.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-text-secondary mt-2">
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      <span className="font-mono font-semibold uppercase">
                        {report.simulationStatus || "Snapshot"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Briefing Preview */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between min-h-[560px]">
          {/* Preview Controls */}
          <div className="bg-bg-primary/50 border-b border-border-custom p-4 flex flex-wrap items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-accent-secondary" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Situation Briefing Preview
              </span>
            </div>
            {detail && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 h-8 text-[11px]"
                  onClick={() => setViewMode((m) => (m === "preview" ? "markdown" : "preview"))}
                >
                  {viewMode === "preview" ? <Code className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {viewMode === "preview" ? "Markdown" : "Formatted"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat !== null}
                  className="flex items-center gap-1.5 h-8 text-[11px]"
                  onClick={() => handleDownload("pdf")}
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingFormat === "pdf" ? "Exporting..." : "PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat !== null}
                  className="flex items-center gap-1.5 h-8 text-[11px]"
                  onClick={() => handleDownload("markdown")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {downloadingFormat === "markdown" ? "Exporting..." : "MD"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat !== null}
                  className="flex items-center gap-1.5 h-8 text-[11px]"
                  onClick={() => handleDownload("csv")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {downloadingFormat === "csv" ? "Exporting..." : "CSV"}
                </Button>
              </div>
            )}
          </div>

          {/* Preview Body */}
          {loadingDetail ? (
            <div className="p-12 flex-1 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 text-accent-primary animate-spin" />
              <span className="text-xs font-mono text-text-secondary">
                Loading immutable report snapshot...
              </span>
            </div>
          ) : !detail || !snap ? (
            <div className="p-12 flex-1 flex flex-col items-center justify-center text-center space-y-2">
              <FileText className="h-10 w-10 text-text-muted" />
              <p className="text-xs text-text-secondary">
                Select a compiled Situation Report from the left panel to preview or export.
              </p>
            </div>
          ) : viewMode === "markdown" ? (
            <pre className="p-6 overflow-y-auto max-h-[580px] font-mono text-[11px] text-text-primary whitespace-pre-wrap leading-relaxed bg-bg-primary/30">
              {detail.markdownContent}
            </pre>
          ) : (
            <div className="p-6 overflow-y-auto max-h-[580px] font-sans text-xs text-text-primary space-y-6 leading-relaxed select-text">
              {/* EOC Letterhead */}
              <div className="text-center border-b border-border-custom pb-4 space-y-1">
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-wider">
                  {snap.classification}
                </span>
                <h2 className="text-sm font-black text-text-primary uppercase">{snap.title}</h2>
                <p className="text-[10px] text-text-secondary font-mono">
                  REF: {snap.reportCode} (v{snap.version}) | SIM STATUS: {snap.simulationStatus.toUpperCase()} | GENERATED: {snap.generatedAt}
                </p>
                <p className="text-[10px] text-text-muted font-mono">
                  Compiled by: {snap.compiledByEmail}
                  {snap.sourceSimulationUpdatedAt ? ` | Source Sim Updated: ${snap.sourceSimulationUpdatedAt}` : ""}
                </p>
              </div>

              {/* I. Situation Summary */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">
                  I. Situation Summary
                </h4>
                <p className="text-text-secondary">{snap.sections.situationSummary}</p>
                {snap.authorNotes && (
                  <p className="text-[11px] bg-bg-primary/50 border border-border-custom rounded-lg p-2.5 text-text-primary">
                    <b>Coordinator Notes:</b> {snap.authorNotes}
                  </p>
                )}
              </div>

              {/* II. Risk & Cascading Timeline */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">
                  II. Risk Assessment & Cascading Timeline
                </h4>
                <p className="text-text-secondary">{snap.sections.riskAssessment}</p>
                <p className="text-text-primary font-medium">{snap.sections.expectedImpact}</p>

                {snap.executedTimesteps.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-border-custom text-left mt-2">
                      <thead>
                        <tr className="bg-bg-primary/50 border-b border-border-custom text-[9px] uppercase tracking-wider">
                          <th className="p-2">Hour</th>
                          <th className="p-2">Phase</th>
                          <th className="p-2 text-right">Casualties</th>
                          <th className="p-2 text-right">Displaced</th>
                          <th className="p-2 text-right">Damage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snap.executedTimesteps.map((ts) => (
                          <tr key={ts.step} className="border-b border-border-custom">
                            <td className="p-2 font-mono font-bold">H{ts.hour}</td>
                            <td className="p-2">{ts.timeLabel}</td>
                            <td className="p-2 text-right font-mono">{ts.metrics.activeCasualties.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{ts.metrics.displacedPopulation.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{ts.metrics.structuralDamagePercentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {snap.pendingTimesteps.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-500">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Pending / Unexecuted Timesteps:{" "}
                      {snap.pendingTimesteps.map((p) => `Hour ${p.hour}`).join(", ")} (excluded from impact totals).
                    </span>
                  </div>
                )}
              </div>

              {/* III. Resource & Deficit Analysis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">
                    III. Logistical Deficit Analysis
                  </h4>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm border border-border-custom bg-bg-primary">
                    Plan: {snap.resourcePlanStatus}
                  </span>
                </div>
                <p className="text-text-secondary">{snap.sections.resourceRecommendations}</p>

                {snap.resources.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-border-custom text-left mt-2">
                      <thead>
                        <tr className="bg-bg-primary/50 border-b border-border-custom text-[9px] uppercase tracking-wider">
                          <th className="p-2">Resource</th>
                          <th className="p-2 text-right">Required</th>
                          <th className="p-2 text-right">Available</th>
                          <th className="p-2 text-right">Deficit</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snap.resources.map((r) => (
                          <tr key={r.key} className="border-b border-border-custom">
                            <td className="p-2 font-semibold">{r.type}</td>
                            <td className="p-2 text-right font-mono">{r.required.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{r.available.toLocaleString()}</td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                r.deficit > 0 ? "text-red-500" : "text-emerald-500"
                              }`}
                            >
                              {r.deficit > 0 ? `-${r.deficit.toLocaleString()}` : "0"}
                            </td>
                            <td className="p-2 font-mono text-[10px]">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* IV. Key Concerns & Tactical Recommendations */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">
                  IV. Key Concerns & Tactical Recommendations
                </h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary">
                  {snap.sections.keyConcerns.split(" | ").map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
                <ol className="list-decimal list-inside space-y-1 text-text-primary pt-1">
                  {snap.sections.suggestedActions.split(" | ").map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ol>
              </div>

              {/* V. Methodology & Data Sources (AI Transparency) */}
              <div className="p-4 rounded-xl bg-bg-primary/40 border border-border-custom space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-primary">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  V. Methodology & Data Sources (AI Transparency)
                </div>
                <p className="text-[11px] text-text-secondary">
                  <b>Historical Data:</b> {snap.provenance.historicalDataSource}
                </p>
                <p className="text-[11px] text-text-secondary">
                  <b>ML Models:</b> {snap.provenance.mlModels.join("; ")}
                </p>
                <p className="text-[11px] text-text-secondary">
                  <b>Simulation & Resource Engines:</b> {snap.provenance.simulationEngine} | {snap.provenance.resourceEngine}
                </p>
                <p className="text-[11px] text-text-secondary">
                  <b>Recommendations:</b> {snap.provenance.recommendationMethod}
                </p>
                <p className="text-[11px] text-text-muted">
                  <b>Limitations:</b> {snap.provenance.limitations.join(" ")}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-border-custom bg-bg-primary/50 flex items-center justify-between text-[9px] text-text-secondary select-none font-mono">
            <span>{snap?.classification || "UNCLASSIFIED // EOC OFFICIAL BRIEF"}</span>
            <span>{snap ? `${snap.reportCode} (Immutable Snapshot v${snap.version})` : "No Report Selected"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
          <span className="text-xs text-text-secondary font-mono">
            Loading Situation Reports Portal...
          </span>
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
