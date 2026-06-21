"use client";

import React from "react";
import { ShieldAlert, Compass, Globe, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function RiskIntelligencePage() {
  const anomalies = [
    { zone: "Sub-Sector 12B", coordinates: "20.1°N, 85.8°E", intensity: "Extreme Cluster", count: 8 },
    { zone: "Sub-Sector 44C", coordinates: "4.8°N, 39.5°E", intensity: "High Cluster", count: 5 }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Risk Intelligence mapping</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Hotspot anomaly detection, DBSCAN clustering, and spatial vulnerability overlays.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Map Hotspots Summary */}
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Clustering Anomalies</h3>
            <p className="text-[9px] text-text-secondary mt-0.5">DBSCAN calculations computed at Chronological intervals.</p>
          </div>
          <div className="space-y-2">
            {anomalies.map((an, i) => (
              <div key={i} className="p-3 bg-bg-primary/40 rounded-xl border border-border-custom text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">{an.zone}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border uppercase ${
                    an.intensity === "Extreme Cluster" 
                      ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20" 
                      : "bg-severity-high/10 text-severity-high border-severity-high/20"
                  }`}>
                    {an.intensity}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                  <span>Coords: {an.coordinates}</span>
                  <span>Events: {an.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Map Grid mockup */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[350px]">
          <div className="border-b border-border-custom pb-3 flex items-center justify-between select-none">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Geospatial Hotspots Monitor</h3>
              <p className="text-[9px] text-text-secondary mt-0.5">Spatial clustering visualization.</p>
            </div>
            <div className="flex items-center gap-1 bg-severity-extreme/10 text-severity-extreme border border-severity-extreme/20 px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold">
              HOTSPOTS DETECTED
            </div>
          </div>
          <div className="flex-1 my-4 bg-[#020617] rounded-xl border border-border-custom flex items-center justify-center text-xs text-text-muted relative overflow-hidden select-none">
            {/* Mock coordinate lines */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-5 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border border-white"></div>
              ))}
            </div>
            {/* Mock cluster dots */}
            <div className="absolute h-6 w-6 rounded-full bg-severity-extreme/40 border border-severity-extreme flex items-center justify-center animate-ping"></div>
            <div className="absolute h-3 w-3 rounded-full bg-severity-extreme border border-white z-10"></div>
            <div className="absolute left-[30%] top-[40%] h-4 w-4 rounded-full bg-severity-high/35 border border-severity-high animate-pulse"></div>
            <div className="absolute left-[65%] top-[70%] h-5 w-5 rounded-full bg-severity-low/30 border border-severity-low"></div>
            <span className="font-mono z-20 text-[10px]">🗺️ [DBSCAN CLUSTER SPATIAL INTERACTIVE - SECTOR ANOMALY MONITOR]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
