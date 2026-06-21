"use client";

import React, { useState } from "react";
import { FileText, Download, FileSpreadsheet, Send, ShieldAlert, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface SitRep {
  id: string;
  name: string;
  date: string;
  severity: "low" | "moderate" | "high" | "extreme" | "critical";
  status: "Final" | "Draft";
  author: string;
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("sitrep-60a4f508");
  
  const reports: SitRep[] = [
    { id: "sitrep-60a4f508", name: "Cyclone Odisha Cat 4 SitRep", date: "2026-06-21", severity: "extreme", status: "Final", author: "Command EOC" },
    { id: "sitrep-60a4f509", name: "Florida Hurricane Spillover", date: "2026-06-20", severity: "high", status: "Final", author: "FEMA Liaison" },
    { id: "sitrep-60a4f510", name: "East Africa Regional Flood", date: "2026-06-18", severity: "critical", status: "Draft", author: "IGAD Coordinator" }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Situation Reports (SitReps)</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Review, compile, and download formal AI-generated situation reports and emergency briefs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Reports List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Compiled Briefings</h3>
          <div className="space-y-2">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full text-left bg-bg-secondary border p-4 rounded-xl shadow-xs transition select-none cursor-pointer flex flex-col justify-between min-h-[100px] ${
                  selectedReport === report.id ? "border-accent-primary ring-1 ring-accent-primary/20" : "border-border-custom hover:bg-bg-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold font-mono text-text-muted">{report.id.toUpperCase()}</span>
                  <SeverityBadge severity={report.severity} />
                </div>
                <h4 className="text-xs font-bold text-text-primary mt-2">{report.name}</h4>
                <div className="flex items-center justify-between text-[10px] text-text-secondary mt-2">
                  <span>{report.date}</span>
                  <span className="font-semibold">{report.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Briefing Preview (Palantir/Bloomberg Document look) */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between min-h-[500px]">
          {/* Document Header Controls */}
          <div className="bg-bg-primary/50 border-b border-border-custom p-4 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-accent-secondary" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Situation Briefing Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8 text-[11px]"
                onClick={() => alert("SitRep binary exported.")}
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8 text-[11px]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Document Body */}
          <div className="p-6 overflow-y-auto max-h-[450px] font-sans text-xs text-text-primary space-y-6 leading-relaxed select-text">
            {/* Gov style letterhead */}
            <div className="text-center border-b border-border-custom pb-4 space-y-1">
              <span className="text-[10px] font-bold text-accent-primary uppercase tracking-wider">FEDERAL EMERGENCY INGESTION & RESPONSE GATEWAY</span>
              <h2 className="text-sm font-black text-text-primary uppercase">INCIDENT SITUATION BRIEFING REPORT</h2>
              <p className="text-[9px] text-text-secondary font-mono">INCIDENT COORDINATES ID: {selectedReport.toUpperCase()} | TIME LOG: 2026-06-21T23:27:00Z</p>
            </div>

            {/* Executive Summary */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">I. Executive Summary</h4>
              <p className="text-text-secondary">
                A major meteorological anomaly was logged in the regional coordinate vectors. Predictive algorithms indicate that cascading municipal infrastructure collapses pose extreme risks to the containment sector. Immediate logistical mobilization is recommended to bridge ambulance and power grid deficits.
              </p>
            </div>

            {/* Situation Overview */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">II. Situation Overview</h4>
              <p className="text-text-secondary">
                The incident area covers critical coastal nodes. Precipitation index readings exceed baseline thresholds by 120%. High water logging on road networks has degraded highway transit speeds to 30km/h.
              </p>
            </div>

            {/* Predicted Impact */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">III. Predicted Impact</h4>
              <p className="text-text-secondary">
                Expected fatalities: 42. Estimated population displaced: 145,000. Combined structural economic damage is forecasted at $1.45M (USD). Substation brownouts are expected to cascade to secondary communication routers within 12 hours.
              </p>
            </div>

            {/* Resource & Deficit Analysis */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">IV. Logistical Deficit Analysis</h4>
              <table className="w-full border border-border-custom text-left mt-2">
                <thead>
                  <tr className="bg-bg-primary/50 border-b border-border-custom">
                    <th className="p-2 font-bold text-[9px] uppercase tracking-wider">Resource Line</th>
                    <th className="p-2 font-bold text-[9px] uppercase tracking-wider">Required</th>
                    <th className="p-2 font-bold text-[9px] uppercase tracking-wider">Stockpile</th>
                    <th className="p-2 font-bold text-[9px] uppercase tracking-wider">Deficit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-custom">
                    <td className="p-2 font-semibold">Ambulance Units</td>
                    <td className="p-2">12</td>
                    <td className="p-2">6</td>
                    <td className="p-2 font-bold text-severity-extreme">-6</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Mobile Generators</td>
                    <td className="p-2">20</td>
                    <td className="p-2">15</td>
                    <td className="p-2 font-bold text-severity-extreme">-5</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-secondary">V. Tactical Recommendations</h4>
              <ul className="list-decimal list-inside space-y-1 text-text-secondary">
                <li>Deploy 6 standby emergency ambulance modules from neighboring sectors.</li>
                <li>Activate backup batteries on secondary SatCom communication loops.</li>
                <li>Distribute fuel tanks to municipal water pump generators in Sector 3.</li>
              </ul>
            </div>
          </div>

          {/* Document Footer */}
          <div className="p-4 border-t border-border-custom bg-bg-primary/50 flex items-center justify-between text-[9px] text-text-secondary select-none font-mono">
            <span>UNCLASSIFIED // EOC OFFICIAL BRIEF</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
