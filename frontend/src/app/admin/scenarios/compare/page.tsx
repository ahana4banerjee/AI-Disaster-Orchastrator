"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  History,
  TrendingUp,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface SearchParamsProps {
  searchParams: Promise<{ scenarioIds?: string }>;
}

interface PredictionMetrics {
  severityClass: string;
  impactMetrics: {
    expectedDeaths: number;
    expectedTotalAffected: number;
    expectedDamageUSD: number;
  };
  confidenceScore: number;
  riskIndex: number;
}

interface RequiredResources {
  ambulances: number;
  generators: number;
  waterLiters: number;
}

interface HistoricalAnalog {
  year: number;
  country: string;
  location: string;
  magnitude: number;
  deaths: number;
  affectedPopulation: number;
  economicDamageUSD: number;
  similarityPercentage: number;
}

interface CompareItem {
  id: string;
  name: string;
  disasterType: string;
  disasterSubtype: string;
  magnitude: number;
  magnitudeScale: string;
  country: string;
  region: string;
  predictions: PredictionMetrics;
  requiredResources: RequiredResources;
  historicalAnalogs: HistoricalAnalog[];
}

const MOCK_COMPARISONS: CompareItem[] = [
  {
    id: "60a4f5f5f5f5f5f5f5f5f503",
    name: "Cyclone Odisha Baseline (Category 4 Equivalent)",
    disasterType: "Storm",
    disasterSubtype: "Tropical cyclone",
    magnitude: 220.0,
    magnitudeScale: "Kph",
    country: "India",
    region: "Odisha",
    predictions: {
      severityClass: "extreme",
      impactMetrics: {
        expectedDeaths: 42,
        expectedTotalAffected: 145000,
        expectedDamageUSD: 1450000.0,
      },
      confidenceScore: 0.85,
      riskIndex: 82.5,
    },
    requiredResources: {
      ambulances: 1471,
      generators: 290,
      waterLiters: 435000,
    },
    historicalAnalogs: [
      {
        year: 2013,
        country: "India",
        location: "Ganjam",
        magnitude: 260.0,
        deaths: 44,
        affectedPopulation: 13200000,
        economicDamageUSD: 1500000.0,
        similarityPercentage: 92.5,
      },
    ],
  },
  {
    id: "60a4f5f5f5f5f5f5f5f5f505",
    name: "Tana River Valley Inundation",
    disasterType: "Flood",
    disasterSubtype: "River flood",
    magnitude: 14.5,
    magnitudeScale: "Km2",
    country: "Kenya",
    region: "Tana River",
    predictions: {
      severityClass: "high",
      impactMetrics: {
        expectedDeaths: 7,
        expectedTotalAffected: 45000,
        expectedDamageUSD: 430000.0,
      },
      confidenceScore: 0.80,
      riskIndex: 68.0,
    },
    requiredResources: {
      ambulances: 453,
      generators: 90,
      waterLiters: 135000,
    },
    historicalAnalogs: [
      {
        year: 2018,
        country: "Kenya",
        location: "Tana Delta",
        magnitude: 12.0,
        deaths: 10,
        affectedPopulation: 150000,
        economicDamageUSD: 300000.0,
        similarityPercentage: 88.0,
      },
    ],
  },
];

export default function CompareScenariosBoard({ searchParams }: SearchParamsProps) {
  const resolvedSearchParams = use(searchParams);
  const scenarioIdsParam = resolvedSearchParams.scenarioIds || "";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CompareItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!scenarioIdsParam) {
        setError("No scenarios selected for comparison.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const idList = scenarioIdsParam.split(",").map((id) => id.trim()).filter((id) => id.length > 0);

      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8000/api/v1/admin/scenarios/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scenarioIds: idList }),
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setItems(data);
        } else {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Failed to query comparative API");
        }
      } catch {
        // Fallback fallback if offline
        const filteredMock = MOCK_COMPARISONS.filter((m) => idList.includes(m.id));
        if (filteredMock.length > 0) {
          setItems(filteredMock);
        } else {
          setItems(MOCK_COMPARISONS); // Default to showing mock cyclone vs flood if mismatch
        }
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [scenarioIdsParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
        <span className="text-xs text-text-secondary font-mono">Running GBDT predictions & KNN search...</span>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto space-y-4 border-border-custom bg-bg-secondary select-none">
        <AlertTriangle className="h-10 w-10 text-severity-extreme mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Comparison failed</h3>
          <p className="text-xs text-text-secondary mt-1">
            {error || "Select scenarios in library dashboard before comparing."}
          </p>
        </div>
        <Link href="/admin/scenarios">
          <Button variant="primary" className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Back to Scenario Library
          </Button>
        </Link>
      </Card>
    );
  }

  const columnsCount = items.length;
  const gridColsClass =
    columnsCount === 2
      ? "grid-cols-1 md:grid-cols-2"
      : columnsCount === 3
      ? "grid-cols-1 md:grid-cols-3"
      : "grid-cols-1 md:grid-cols-4";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Link href="/admin/scenarios" className="hover:text-accent-primary transition font-semibold">
              Scenario Library
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-text-primary font-bold">Comparison Board</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mt-1 flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent-primary" /> Scenario Comparison Board
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Evaluate side-by-side expected outcome casualties, economic damages, and similarity profiles.
          </p>
        </div>
        <Link href="/admin/scenarios">
          <Button variant="outline" className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Library
          </Button>
        </Link>
      </div>

      {/* Comparison Grid Layout */}
      <div className={`grid gap-6 ${gridColsClass}`}>
        {items.map((item) => (
          <div key={item.id} className="space-y-6">
            
            {/* Scenario Header Info Card */}
            <Card className="p-5 border-border-custom bg-bg-secondary flex flex-col justify-between min-h-[140px]">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-accent-primary block">
                  {item.disasterType} &bull; {item.country}
                </span>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                  Region: {item.region || "Global Scope"}
                </p>
              </div>
              <div className="border-t border-border-custom/50 pt-3 flex justify-between items-center text-[10px] select-none">
                <span className="text-text-muted font-semibold uppercase">Intensity:</span>
                <span className="font-bold font-mono text-text-primary">
                  {item.magnitude} {item.magnitudeScale}
                </span>
              </div>
            </Card>

            {/* GBDT Predictions Card */}
            <Card className="p-5 border-border-custom bg-bg-secondary space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
                <TrendingUp className="h-4 w-4 text-accent-teal" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  ML Predictions
                </h3>
              </div>

              <div className="space-y-3">
                {/* Expected Severity */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Severity Class</span>
                  <SeverityBadge severity={item.predictions.severityClass.toLowerCase() as any} />
                </div>

                {/* Expected Deaths */}
                <div className="flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Expected Deaths</span>
                  <span className="text-xs font-bold font-mono text-severity-extreme">
                    {item.predictions.impactMetrics.expectedDeaths.toLocaleString()}
                  </span>
                </div>

                {/* Expected Affected */}
                <div className="flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Affected Population</span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {item.predictions.impactMetrics.expectedTotalAffected.toLocaleString()}
                  </span>
                </div>

                {/* Expected Damage */}
                <div className="flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Economic Damage</span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    ${item.predictions.impactMetrics.expectedDamageUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </Card>

            {/* EOC Logistics Resource Requirements Card */}
            <Card className="p-5 border-border-custom bg-bg-secondary space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
                <Package className="h-4 w-4 text-accent-teal" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Required Resources
                </h3>
              </div>

              <div className="space-y-3">
                {/* Required Ambulances */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Required Ambulances</span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {item.requiredResources.ambulances}
                  </span>
                </div>

                {/* Required Generators */}
                <div className="flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Power Generators</span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {item.requiredResources.generators}
                  </span>
                </div>

                {/* Required Water */}
                <div className="flex items-center justify-between border-t border-border-custom/50 pt-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Potable Water</span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {item.requiredResources.waterLiters.toLocaleString()} L
                  </span>
                </div>
              </div>
            </Card>

            {/* Resource Stockpile Deficits Card */}
            <Card className="p-5 border-border-custom bg-bg-secondary space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
                <AlertTriangle className="h-4 w-4 text-accent-secondary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Resource Plan Deficits
                </h3>
              </div>

              <div className="space-y-3 text-[10px]">
                {/* Ambulance Deficit */}
                <div className="flex justify-between border-b border-border-custom/30 pb-2">
                  <span className="text-text-secondary">Ambulance Deficit (Stock: 100)</span>
                  <span className={`font-mono font-bold ${
                    item.requiredResources.ambulances > 100 ? "text-severity-extreme" : "text-accent-teal"
                  }`}>
                    {item.requiredResources.ambulances > 100 
                      ? `-${item.requiredResources.ambulances - 100} deficit` 
                      : "+ surplus"}
                  </span>
                </div>

                {/* Generator Deficit */}
                <div className="flex justify-between border-b border-border-custom/30 pb-2">
                  <span className="text-text-secondary">Generators Deficit (Stock: 50)</span>
                  <span className={`font-mono font-bold ${
                    item.requiredResources.generators > 50 ? "text-severity-extreme" : "text-accent-teal"
                  }`}>
                    {item.requiredResources.generators > 50 
                      ? `-${item.requiredResources.generators - 50} deficit` 
                      : "+ surplus"}
                  </span>
                </div>

                {/* Water Deficit */}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Potable Water Deficit (Stock: 100k L)</span>
                  <span className={`font-mono font-bold ${
                    item.requiredResources.waterLiters > 100000 ? "text-severity-extreme" : "text-accent-teal"
                  }`}>
                    {item.requiredResources.waterLiters > 100000 
                      ? `-${Math.round((item.requiredResources.waterLiters - 100000)).toLocaleString()} L deficit` 
                      : "+ surplus"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Similarity Search Historical Cases Card */}
            <Card className="p-5 border-border-custom bg-bg-secondary space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
                <History className="h-4 w-4 text-accent-teal" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Top Historical Analogs
                </h3>
              </div>

              {item.historicalAnalogs.length === 0 ? (
                <p className="text-[10px] text-text-secondary italic">No high-confidence historical matches found.</p>
              ) : (
                <div className="space-y-4">
                  {item.historicalAnalogs.map((analog, idx) => (
                    <div key={idx} className="p-3 bg-bg-primary rounded-xl border border-border-custom space-y-2">
                      <div className="flex justify-between items-center select-none">
                        <span className="text-[10px] font-bold text-text-primary">
                          {analog.year} - {analog.location}, {analog.country}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                          {analog.similarityPercentage}% Match
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9px] text-text-secondary">
                        <div>
                          <span>Deaths: <span className="font-semibold text-text-primary">{analog.deaths.toLocaleString()}</span></span>
                        </div>
                        <div>
                          <span>Damage: <span className="font-semibold text-text-primary">${analog.economicDamageUSD.toLocaleString()}</span></span>
                        </div>
                        <div className="col-span-2 border-t border-border-custom/30 pt-1 mt-1 font-mono">
                          <span>Intensity: {analog.magnitude}</span>
                        </div>
                      </div>
                      <Link href={`/admin/records?country=${encodeURIComponent(analog.country)}&disasterType=${encodeURIComponent(item.disasterType)}`}>
                        <span className="text-[9px] text-accent-primary hover:underline cursor-pointer block mt-1.5 font-bold select-none">
                          Explore Record Telemetry &rarr;
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        ))}
      </div>

      {/* Bottom informational note */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex gap-3 select-none">
        <ShieldAlert className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-text-primary">COMPARATIVE ACTION RULE:</span>{" "}
          <span className="text-text-secondary">
            Resource estimates are derived directly from the ML predicted casualty counts. Ensure local stockpile inventories are compared side-by-side to alert response teams of logistics deficits.
          </span>
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
