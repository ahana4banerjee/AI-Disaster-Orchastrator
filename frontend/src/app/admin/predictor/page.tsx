"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, AlertTriangle, Cpu } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Skeleton } from "@/components/ui/Skeleton";

interface FeatureDriver {
  name: string;
  impact: number;
  widthPct: number;
}

interface PredictionResult {
  severityClass: string;
  impactMetrics: {
    expectedDeaths: number;
    expectedTotalAffected: number;
    expectedDamageUSD: number;
  };
  confidenceScore: number;
  riskIndex: number;
  featureDrivers?: FeatureDriver[];
}

function formatDamageUSD(val: number): string {
  if (!val || val <= 0) return "$0";
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export default function PredictorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const [hazardType, setHazardType] = useState("Storm");
  const [country, setCountry] = useState("India");
  const [region, setRegion] = useState("Odisha");
  const [magnitude, setMagnitude] = useState("220");
  const [startMonth, setStartMonth] = useState("10");

  const runPrediction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const subtypeMap: Record<string, string> = {
        Storm: "Tropical cyclone",
        Earthquake: "Ground movement",
        Flood: "Flash flood",
        Wildfire: "Forest fire",
        Landslide: "Mudslide",
        Drought: "Drought",
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/predict/impact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disasterType: hazardType,
          disasterSubtype: subtypeMap[hazardType] || "",
          country: country.trim() || "India",
          region: region.trim() || "Global",
          magnitude: Math.max(0.1, parseFloat(magnitude) || 1.0),
          startMonth: Math.min(12, Math.max(1, parseInt(startMonth, 10) || 6)),
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "ML prediction request failed");
      }

      const data: PredictionResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unable to communicate with ML prediction service.");
    } finally {
      setLoading(false);
    }
  }, [hazardType, country, region, magnitude, startMonth, router]);

  useEffect(() => {
    runPrediction();
    // Run initial prediction once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    runPrediction();
  };

  const confidencePct = result ? (result.confidenceScore * 100).toFixed(1) : "0.0";
  const riskRounded = result ? Math.round(result.riskIndex) : 0;
  const riskBorderColor =
    riskRounded >= 75
      ? "border-severity-extreme"
      : riskRounded >= 50
      ? "border-severity-high"
      : riskRounded >= 25
      ? "border-severity-moderate"
      : "border-severity-low";

  const drivers: FeatureDriver[] = result?.featureDrivers || [
    { name: "Magnitude", impact: 0.35, widthPct: 55 },
    { name: "Region Density", impact: 0.22, widthPct: 35 },
    { name: "Country Risk", impact: 0.14, widthPct: 25 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Risk Forecasting & Impact Predictor
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Configure hazard parameters to run multi-output XGBoost predictions and feature driver analyses.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 text-xs text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block">ML Inference Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Form Panel */}
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <form onSubmit={handlePredict} className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono mb-4 border-b border-border-custom pb-2">
                Predictive Parameters
              </h3>
            </div>

            <Select
              label="Disaster Type"
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              required
              id="hazard-type"
            >
              <option value="Storm">Storm / Cyclone</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Flood">Flood</option>
              <option value="Wildfire">Wildfire</option>
              <option value="Landslide">Landslide</option>
              <option value="Drought">Drought</option>
            </Select>

            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              placeholder="e.g. India"
              id="country"
            />

            <Input
              label="Region / State"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Odisha"
              id="region"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hazard Magnitude"
                type="number"
                step="0.1"
                min="0.1"
                value={magnitude}
                onChange={(e) => setMagnitude(e.target.value)}
                required
                placeholder="e.g. 220"
                id="magnitude"
              />

              <Input
                label="Start Month (1-12)"
                type="number"
                min="1"
                max="12"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                required
                id="start-month"
              />
            </div>

            <Button
              type="submit"
              className="w-full flex items-center gap-1.5 mt-4"
              disabled={loading}
            >
              <Brain className="h-4 w-4" />
              {loading ? "Computing Forecast..." : "Calculate Forecast"}
            </Button>
          </form>
        </div>

        {/* Right: Results Dashboard Panel */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-28 w-full" />
            </div>
          ) : !result ? (
            <div className="bg-bg-secondary border border-border-custom border-dashed rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center text-text-muted">
              <Cpu className="h-8 w-8 text-text-muted mb-3" />
              <p className="font-bold text-xs">AWAITING ML INFERENCE</p>
              <p className="text-[10px] text-text-secondary max-w-xs mt-1">
                Configure model parameters and run forecast calculations to compile EOC indicators.
              </p>
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-6">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-accent-secondary" />
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                    EOC Forecast Matrix ({hazardType} &bull; {country})
                  </span>
                </div>
                <SeverityBadge severity={result.severityClass} />
              </div>

              {/* Multi-Output Targets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Expected Fatalities
                  </span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">
                    {result.impactMetrics.expectedDeaths.toLocaleString()}
                  </div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Displaced Population
                  </span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">
                    {result.impactMetrics.expectedTotalAffected.toLocaleString()}
                  </div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Adjusted Economic Loss
                  </span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">
                    {formatDamageUSD(result.impactMetrics.expectedDamageUSD)}
                  </div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
              </div>

              {/* Confidence & Risk Scale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-custom pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase select-none">
                    <span>Forecast Confidence</span>
                    <span className="font-mono">{confidencePct}%</span>
                  </div>
                  <div className="h-3 w-full bg-border-custom rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-300"
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-text-muted">
                    Calculated relative to historical regional training density and feature completeness.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-bg-primary/40 p-4 border border-border-custom rounded-xl select-none">
                  <div
                    className={`relative h-12 w-12 flex items-center justify-center bg-bg-secondary rounded-full border-2 ${riskBorderColor} text-xs font-bold font-mono text-text-primary`}
                  >
                    {riskRounded}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider block">
                      Risk Score Gauge
                    </span>
                    <span className="text-[9px] text-text-secondary">
                      {result.severityClass} hazard potential flagged.
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Driver Analysis */}
              <div className="border-t border-border-custom pt-4 space-y-3 select-none">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary font-mono">
                    Feature Driver Analysis
                  </h4>
                  <p className="text-[9px] text-text-secondary mt-0.5">
                    Normalized feature contributions influencing predicted severity and impact.
                  </p>
                </div>
                <div className="space-y-2 font-mono text-[10px]">
                  {drivers.map((d) => {
                    const isPositive = d.impact >= 0;
                    return (
                      <div key={d.name} className="flex items-center gap-4">
                        <span className="w-28 text-text-secondary truncate">{d.name}</span>
                        <div
                          className={`flex-1 h-3 bg-border-custom rounded-xs overflow-hidden flex ${
                            isPositive ? "" : "justify-end"
                          }`}
                        >
                          <div
                            className={`h-full ${isPositive ? "bg-severity-extreme" : "bg-severity-low"}`}
                            style={{ width: `${d.widthPct}%` }}
                          />
                        </div>
                        <span
                          className={`w-12 text-right font-bold ${
                            isPositive ? "text-severity-extreme" : "text-severity-low"
                          }`}
                        >
                          {isPositive ? `+${d.impact.toFixed(2)}` : d.impact.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
