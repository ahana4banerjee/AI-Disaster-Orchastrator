"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, AlertTriangle, Layers } from "lucide-react";
import type { RiskHotspot } from "@/components/ui/RiskHotspotsMap";

const RiskHotspotsMap = dynamic(
  () => import("@/components/ui/RiskHotspotsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[430px] w-full bg-bg-primary/40 rounded-xl border border-border-custom flex flex-col items-center justify-center space-y-2">
        <Loader2 className="h-6 w-6 text-accent-primary animate-spin" />
        <span className="text-xs font-mono text-text-secondary">
          Initializing Leaflet geospatial map...
        </span>
      </div>
    ),
  }
);

export default function RiskIntelligencePage() {
  const router = useRouter();
  const [hotspots, setHotspots] = useState<RiskHotspot[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<RiskHotspot | null>(null);
  const [riskFilter, setRiskFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/analytics/risk-hotspots", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to load geospatial hotspots");
      }
      const data = await res.json();
      setHotspots(data.hotspots || []);
    } catch (err: any) {
      setError(err.message || "Unable to load risk intelligence hotspots.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  const filteredHotspots =
    riskFilter === "All"
      ? hotspots
      : hotspots.filter((h) => h.riskLevel === riskFilter);

  const clusters: Array<{ level: "High" | "Medium" | "Low"; label: string; badgeClass: string; dotClass: string }> = [
    {
      level: "High",
      label: "High Risk Cluster",
      badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
      dotClass: "bg-red-500",
    },
    {
      level: "Medium",
      label: "Medium Risk Cluster",
      badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      dotClass: "bg-amber-500",
    },
    {
      level: "Low",
      label: "Low Risk Cluster",
      badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      dotClass: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Risk Intelligence Mapping
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Interactive Leaflet geospatial hotspot monitor with K-Means regional risk clusters and predicted hazard profiles.
          </p>
        </div>

        {/* Risk Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(["All", "High", "Medium", "Low"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                riskFilter === lvl
                  ? "bg-accent-primary text-white border-accent-primary"
                  : "bg-bg-secondary text-text-secondary border-border-custom hover:text-text-primary"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 text-xs text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block">Risk Intelligence Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Map + Legend */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-border-custom pb-3 flex flex-wrap items-center justify-between gap-3 select-none">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">
              Geospatial Hotspots Monitor
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Hover over any hotspot marker to view predicted disaster type, magnitude, and place.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Low Risk
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medium Risk
            </span>
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> High Risk
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[430px] flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-7 w-7 text-accent-primary animate-spin" />
            <span className="text-xs font-mono text-text-secondary">
              Loading EM-DAT geospatial risk clusters...
            </span>
          </div>
        ) : (
          <RiskHotspotsMap
            hotspots={filteredHotspots}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
          />
        )}
      </div>

      {/* Clustering Anomalies + Individual Places Below Each Cluster */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 select-none">
          <Layers className="h-4 w-4 text-accent-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">
            Clustering Anomalies & Individual Places ({filteredHotspots.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {clusters
            .filter((c) => riskFilter === "All" || riskFilter === c.level)
            .map((cluster) => {
              const places = filteredHotspots.filter((h) => h.riskLevel === cluster.level);
              return (
                <div
                  key={cluster.level}
                  className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col space-y-4"
                >
                  {/* Cluster Header */}
                  <div className="flex items-center justify-between border-b border-border-custom pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${cluster.dotClass}`} />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {cluster.label}
                      </h4>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-sm border uppercase font-mono ${cluster.badgeClass}`}
                    >
                      {places.length} Places
                    </span>
                  </div>

                  {/* Individual Places Listed Below the Cluster */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {places.length === 0 ? (
                      <p className="text-xs text-text-secondary py-4 text-center">
                        No places in this cluster.
                      </p>
                    ) : (
                      places.map((spot) => {
                        const isSelected = selectedPlace?.place === spot.place;
                        return (
                          <button
                            key={`${spot.place}-${spot.subregion}`}
                            onClick={() => setSelectedPlace(spot)}
                            className={`w-full text-left p-3 rounded-xl border transition cursor-pointer space-y-1 ${
                              isSelected
                                ? "bg-accent-primary/10 border-accent-primary"
                                : "bg-bg-primary/40 border-border-custom hover:bg-bg-primary/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-accent-secondary shrink-0" />
                                {spot.place}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">
                                {spot.eventCount} events
                              </span>
                            </div>
                            <div className="text-[10px] text-text-secondary flex flex-wrap items-center justify-between gap-2 font-mono">
                              <span>
                                {spot.predictedDisasterType} &bull; Mag:{" "}
                                {spot.predictedMagnitude !== null ? spot.predictedMagnitude : "N/A"}
                              </span>
                              <span>
                                {spot.latitude.toFixed(1)}°, {spot.longitude.toFixed(1)}°
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
