"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BarChart,
  ArrowLeft,
  Database,
  Activity,
  AlertTriangle,
  Layers,
  LineChart,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

// Dynamically load the Leaflet GIS Map with SSR disabled to prevent compilation crashes on window references
const InsightsMap = dynamic(
  () => import("@/components/ui/InsightsMap"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full bg-bg-primary rounded-lg flex items-center justify-center border border-border-custom border-dashed text-xs font-mono uppercase tracking-wider text-text-muted animate-pulse">
        Initializing GIS Map engine...
      </div>
    )
  }
);

interface RegionalCluster {
  subregion: string;
  frequency: number;
  mortalityRate: number;
  economicRisk: number;
  maxMagnitude: number;
  clusterId: number;
  riskTier: string;
  updatedAt: string;
}

export default function RegionalDisasterInsights() {
  const [loading, setLoading] = useState(true);
  const [clusters, setClusters] = useState<RegionalCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<RegionalCluster | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // High-fidelity fallback simulated K-Means clusters if database is empty/offline
  const fallbackClusters: RegionalCluster[] = [
    { subregion: "Southern Asia", frequency: 827.77, mortalityRate: 0.0078, economicRisk: 0.0028, maxMagnitude: 7.9, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "South-eastern Asia", frequency: 683.33, mortalityRate: 0.0322, economicRisk: 0.0021, maxMagnitude: 7.5, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Eastern Africa", frequency: 312.42, mortalityRate: 0.00042, economicRisk: 0.0008, maxMagnitude: 6.2, clusterId: 2, riskTier: "High", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Latin America and the Caribbean", frequency: 918.51, mortalityRate: 0.0778, economicRisk: 0.0019, maxMagnitude: 6.8, clusterId: 1, riskTier: "High", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Northern America", frequency: 317.40, mortalityRate: 0.0046, economicRisk: 0.0035, maxMagnitude: 6.0, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Western Europe", frequency: 146.29, mortalityRate: 0.1097, economicRisk: 0.0022, maxMagnitude: 5.5, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Northern Europe", frequency: 69.25, mortalityRate: 0.0722, economicRisk: 0.0005, maxMagnitude: 4.8, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Western Asia", frequency: 247.40, mortalityRate: 0.0430, economicRisk: 0.0011, maxMagnitude: 6.5, clusterId: 0, riskTier: "Low", updatedAt: "2026-06-30T12:00:00Z" },
    { subregion: "Polynesia", frequency: 15.18, mortalityRate: 1.4808, economicRisk: 0.0059, maxMagnitude: 54046.0, clusterId: 3, riskTier: "Medium", updatedAt: "2026-06-30T12:00:00Z" },
  ];

  const fetchClusters = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/analytics/regional-risk");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setClusters(data);
          setSelectedCluster(data[0]);
          setStatusMessage({ text: "K-MEANS CLUSTERS LINK ACTIVE. TELEMETRY STREAMING ONLINE.", type: "success" });
        } else {
          setClusters(fallbackClusters);
          setSelectedCluster(fallbackClusters[0]);
          setStatusMessage({ text: "NO CLUSTERS FOUND IN DATABASE. RENDERING PRE-TRAINED SIMULATED CLUSTERING.", type: "warning" });
        }
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      setClusters(fallbackClusters);
      setSelectedCluster(fallbackClusters[0]);
      setStatusMessage({ text: "LOCAL ML-FAILOVER ACTIVE. RENDERING SIMULATED CLUSTERING.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  // Group count for risk tiers summary
  const tierCounts = clusters.reduce((acc, c) => {
    const tier = c.riskTier || "Unknown";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Insights</span>
      </div>

      {/* Telemetry connection status */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 ${
          statusMessage.type === "success" 
            ? "bg-severity-low/10 text-severity-low border-severity-low/20"
            : "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20"
        }`}>
          <Database className="h-4 w-4 animate-pulse shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Overview summaries of risk levels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Extreme Risk Subregions", value: tierCounts["Extreme"] || 0, color: "border-l-severity-extreme" },
          { label: "High Risk Subregions", value: (tierCounts["High"] || 0) + (tierCounts["Medium"] || 0), color: "border-l-severity-high" },
          { label: "Moderate Risk Subregions", value: tierCounts["Moderate"] || 0, color: "border-l-severity-moderate" },
          { label: "Low Risk Subregions", value: tierCounts["Low"] || 0, color: "border-l-severity-low" },
        ].map((item, idx) => (
          <Card key={idx} className={`p-5 border-l-4 ${item.color}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{item.label}</span>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight mt-1">
              {loading ? "..." : item.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Grid: SVG Risk Matrix Map & Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        
        {/* Interactive GIS Insights Map */}
        <Card className="lg:col-span-8 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border-custom pb-3">
            <LineChart className="h-4.5 w-4.5 text-accent-primary animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Global Subregion Risk Clustering Map
            </h3>
          </div>

          <div className="relative border border-border-custom rounded-lg bg-bg-primary h-[360px] overflow-hidden select-none shadow-inner z-10">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center text-xs font-mono uppercase tracking-wider text-text-muted animate-pulse">
                Initializing GIS Map engine...
              </div>
            ) : (
              <InsightsMap
                clusters={clusters}
                selectedCluster={selectedCluster}
                onClusterSelect={setSelectedCluster}
              />
            )}
          </div>
        </Card>

        {/* Selected Cluster Details Card */}
        <Card className="lg:col-span-4 p-6 space-y-6 h-full min-h-[442px] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border-custom pb-3">
              <Layers className="h-4.5 w-4.5 text-accent-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Cluster Telemetry Analysis
              </h3>
            </div>

            {selectedCluster ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    Subregion Profile
                  </span>
                  <h4 className="text-lg font-black text-text-primary uppercase tracking-tight pt-2">
                    {selectedCluster.subregion}
                  </h4>
                </div>

                <div className="space-y-3 font-semibold text-xs border-t border-border-custom pt-4">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">K-Means Cluster ID</span>
                    <span className="font-mono text-text-primary">Cluster {selectedCluster.clusterId}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Risk Tier Level</span>
                    <SeverityBadge severity={selectedCluster.riskTier} />
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-border-custom/50 pt-2">
                    <span className="text-text-muted">Incident Frequency</span>
                    <span className="font-mono text-text-primary">{selectedCluster.frequency.toFixed(2)} events/yr</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Mortality Rate Coeff.</span>
                    <span className="font-mono text-text-primary">{(selectedCluster.mortalityRate * 100).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Economic Damage Factor</span>
                    <span className="font-mono text-text-primary">{(selectedCluster.economicRisk * 100).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Max Logged Magnitude</span>
                    <span className="font-mono text-text-primary">
                      {selectedCluster.maxMagnitude > 1000 
                        ? `${(selectedCluster.maxMagnitude / 1000000).toFixed(1)}M`
                        : selectedCluster.maxMagnitude.toFixed(1)
                      }
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-muted uppercase font-bold tracking-wider">
                Select subregion to inspect metrics
              </div>
            )}
          </div>

          <div className="text-[10px] text-text-muted font-semibold leading-relaxed border-t border-border-custom pt-3 mt-4">
            TELEMETRY REFRESH: Updated weekly from EOC central command.
          </div>
        </Card>

      </div>

      {/* All Subregions Cluster Datatable */}
      <Card className="overflow-hidden border border-border-custom bg-bg-secondary">
        <div className="p-4 border-b border-border-custom bg-bg-primary flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-primary" />
            Global Subregion Cluster Database
          </h3>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-bg-primary border-b border-border-custom text-text-secondary uppercase font-bold tracking-wider text-[10px]">
                  <th className="p-4">Subregion</th>
                  <th className="p-4">Cluster ID</th>
                  <th className="p-4">Frequency</th>
                  <th className="p-4">Max Magnitude</th>
                  <th className="p-4 text-center">Risk Tier</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((c, idx) => (
                  <tr
                    key={c.subregion || idx}
                    className={`border-b border-border-custom hover:bg-bg-primary/40 transition duration-150 cursor-pointer ${
                      selectedCluster?.subregion === c.subregion ? "bg-bg-primary/60" : ""
                    }`}
                    onClick={() => setSelectedCluster(c)}
                  >
                    <td className="p-4 font-bold text-text-primary uppercase">{c.subregion}</td>
                    <td className="p-4 font-mono font-bold text-text-secondary">Cluster {c.clusterId}</td>
                    <td className="p-4 font-mono font-semibold text-text-primary">{c.frequency.toFixed(2)}/yr</td>
                    <td className="p-4 font-mono font-semibold text-text-primary">
                      {c.maxMagnitude > 1000 
                        ? `${(c.maxMagnitude / 1000000).toFixed(1)}M`
                        : c.maxMagnitude.toFixed(1)
                      }
                    </td>
                    <td className="p-4 text-center">
                      <SeverityBadge severity={c.riskTier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
}
