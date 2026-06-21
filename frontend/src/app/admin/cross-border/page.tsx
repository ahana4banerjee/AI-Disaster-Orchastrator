"use client";

import React from "react";
import { Compass, ShieldAlert, Globe, ArrowRight } from "lucide-react";

export default function CrossBorderPage() {
  const spilloverHazards = [
    { sourceCountry: "Sudan", targetCountry: "South Sudan", spilloverType: "Flooding", severity: "Extreme", capacityDeficit: "High" },
    { sourceCountry: "India", targetCountry: "Bangladesh", spilloverType: "Cyclone / Surge", severity: "Extreme", capacityDeficit: "Extreme" },
    { sourceCountry: "DR Congo", targetCountry: "Rwanda", spilloverType: "Volcanic Ash", severity: "High", capacityDeficit: "Moderate" }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Cross-Border Risk Assessment</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Coordinate spillover vulnerability indices, downstream catchment models, and international resource pipelines.
          </p>
        </div>
      </div>

      {/* Spillover Logs Grid */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border-custom bg-bg-primary/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Transboundary Hazard Indicators</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="h-[60px] border-b border-border-custom bg-bg-secondary text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <th className="px-5">Source Country</th>
                <th className="px-5"></th>
                <th className="px-5">Target Country</th>
                <th className="px-5">Spillover Hazard</th>
                <th className="px-5">Severity Impact</th>
                <th className="px-5">Host Capacity Deficit</th>
              </tr>
            </thead>
            <tbody>
              {spilloverHazards.map((sh, idx) => (
                <tr
                  key={idx}
                  className="h-[56px] border-b border-border-custom hover:bg-bg-primary/40 transition duration-100 text-xs text-text-primary font-medium"
                >
                  <td className="px-5 font-bold">{sh.sourceCountry}</td>
                  <td className="px-5 text-text-secondary">
                    <ArrowRight className="h-4 w-4 text-accent-secondary" />
                  </td>
                  <td className="px-5 font-bold">{sh.targetCountry}</td>
                  <td className="px-5 text-text-secondary">{sh.spilloverType}</td>
                  <td className="px-5">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                      sh.severity === "Extreme" 
                        ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20" 
                        : "bg-severity-high/10 text-severity-high border-severity-high/20"
                    }`}>
                      {sh.severity}
                    </span>
                  </td>
                  <td className="px-5">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                      sh.capacityDeficit === "Extreme" || sh.capacityDeficit === "High"
                        ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20"
                        : "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20"
                    }`}>
                      {sh.capacityDeficit} Deficit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
