"use client";

import React from "react";
import { Layers, HelpCircle, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface Scenario {
  name: string;
  type: string;
  region: string;
  severity: "low" | "moderate" | "high" | "extreme" | "critical";
  deaths: string;
  affected: string;
  damage: string;
  resources: string[];
}

export default function ScenariosPage() {
  const scenarios: Scenario[] = [
    {
      name: "Scenario Alpha",
      type: "Cyclone (Cat 4)",
      region: "Odisha, India",
      severity: "extreme",
      deaths: "42 (Predicted)",
      affected: "145,000",
      damage: "$1.45M",
      resources: ["12 Ambulances", "4 Rescue Boats", "20 Generators"]
    },
    {
      name: "Scenario Beta",
      type: "Coastal Storm",
      region: "Florida, USA",
      severity: "high",
      deaths: "4 (Predicted)",
      affected: "12,500",
      damage: "$2.30M",
      resources: ["6 Ambulances", "2 Evacuation Units", "10 Generators"]
    },
    {
      name: "Scenario Gamma",
      type: "Flash Floods",
      region: "Garissa, Kenya",
      severity: "critical",
      deaths: "95 (Predicted)",
      affected: "240,000",
      damage: "$0.85M",
      resources: ["24 Ambulances", "12 Rescue Boats", "50 Generators"]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls bar */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Scenario Templates</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Evaluate side-by-side hypothetical disaster matrices and resource requirement forecasts.
          </p>
        </div>
      </div>

      {/* Scenario Grid Compare Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((sc, idx) => (
          <div 
            key={idx}
            className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between"
          >
            {/* Header Title */}
            <div className="bg-bg-primary/50 border-b border-border-custom p-5">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">{sc.name}</h3>
              <p className="text-[10px] text-text-secondary font-mono mt-0.5">{sc.type} - {sc.region}</p>
            </div>

            {/* Matrix Properties */}
            <div className="p-5 space-y-4 flex-1">
              {/* Severity */}
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Expected Severity</span>
                <SeverityBadge severity={sc.severity} />
              </div>

              {/* Casualties */}
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Predicted Deaths</span>
                <span className="text-xs font-bold font-mono text-text-primary">{sc.deaths}</span>
              </div>

              {/* Affected */}
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Affected Population</span>
                <span className="text-xs font-bold font-mono text-text-primary">{sc.affected}</span>
              </div>

              {/* Damages */}
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Economic Damages</span>
                <span className="text-xs font-bold font-mono text-text-primary">{sc.damage}</span>
              </div>

              {/* Logistics */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">Logistical Allocation</span>
                <div className="space-y-1">
                  {sc.resources.map((res, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-text-primary">
                      <div className="h-1.5 w-1.5 bg-accent-secondary rounded-full"></div>
                      <span>{res}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-border-custom bg-bg-primary/10 flex items-center justify-between">
              <span className="text-[9px] text-text-muted font-mono uppercase">Operational Profile Loaded</span>
              <span className="text-[9px] bg-accent-primary/10 text-accent-primary font-bold px-2 py-0.5 rounded-sm border border-accent-primary/20">
                ACTIVE PLAN A
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom informational note */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex gap-3 select-none">
        <ShieldAlert className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-text-primary">EOC Comparative Rule: </span>
          <span className="text-text-secondary">
            Scenarios compare simulated resource pipelines against real-world stockpiles. Deficits automatically trigger high-alert flags during progression checks.
          </span>
        </div>
      </div>
    </div>
  );
}
