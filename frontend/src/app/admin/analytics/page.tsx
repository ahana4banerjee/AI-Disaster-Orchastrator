"use client";

import React from "react";
import { BarChart3, ShieldAlert, Globe, Compass } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function AnalyticsPage() {
  const regionalRisks = [
    { region: "Southern Asia", events: 140, risk: "High", index: 8.2 },
    { region: "South-Eastern Asia", events: 110, risk: "High", index: 7.9 },
    { region: "Eastern Africa", events: 94, risk: "Extreme", index: 9.1 },
    { region: "Northern America", events: 82, risk: "Moderate", index: 5.6 },
    { region: "South America", events: 76, risk: "Moderate", index: 6.2 }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Regional Risk Analytics</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Hotspot aggregations, geographical vulnerability maps, and macro-hazard trend reports.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Risk Table */}
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Vulnerability Rankings</h3>
            <p className="text-[9px] text-text-secondary mt-0.5">Top subregions ranked by composite threat indexes.</p>
          </div>
          <div className="space-y-2">
            {regionalRisks.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg-primary/40 rounded-xl border border-border-custom text-xs">
                <div>
                  <span className="font-bold text-text-primary">{r.region}</span>
                  <p className="text-[9px] text-text-secondary">{r.events} recorded events</p>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase ${
                    r.risk === "Extreme" 
                      ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20" 
                      : "bg-severity-high/10 text-severity-high border-severity-high/20"
                  }`}>
                    {r.risk}
                  </span>
                  <span className="block font-mono text-[10px] text-text-muted mt-1">Index: {r.index}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Spatial heat map layout */}
        <div className="md:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[300px]">
          <div className="border-b border-border-custom pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Spatial Density Map Grid</h3>
            <p className="text-[9px] text-text-secondary mt-0.5">Mock geographic matrix layout displaying recorded event density.</p>
          </div>
          {/* Spatial Grid mockup */}
          <div className="flex-1 my-4 grid grid-cols-8 gap-1.5 p-3 bg-[#020617] rounded-xl border border-border-custom select-none">
            {Array.from({ length: 48 }).map((_, i) => {
              const opacity = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9][i % 7];
              const color = i % 11 === 0 ? "bg-severity-extreme" : i % 5 === 0 ? "bg-accent-secondary" : "bg-accent-primary";
              return (
                <div 
                  key={i} 
                  className={`rounded-xs ${color}`} 
                  style={{ opacity: opacity }}
                  title={`Subsector density: ${(opacity * 100).toFixed(0)}%`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-secondary select-none font-mono mt-2">
            <span>Coordinate range: 180°W to 180°E</span>
            <span>Density threshold: Log Scale</span>
          </div>
        </div>
      </div>
    </div>
  );
}
