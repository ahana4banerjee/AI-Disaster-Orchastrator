"use client";

import React, { useState } from "react";
import { Brain, Sparkles, AlertTriangle, ShieldAlert, Cpu } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function PredictorPage() {
  const [loading, setLoading] = useState(false);
  const [hasResults, setHasResults] = useState(true);
  const [hazardType, setHazardType] = useState("Cyclone");
  const [country, setCountry] = useState("India");
  const [magnitude, setMagnitude] = useState("4.5");

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setHasResults(true);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Risk Forecasting & Impact Predictor</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Configure mock hazard parameters to run multi-output XGBoost predictions and SHAP explainability analyses.
          </p>
        </div>
      </div>

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
              <option value="Cyclone">Cyclone</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Flood">Flood</option>
              <option value="Wildfire">Wildfire</option>
            </Select>

            <Input
              label="Country Coordinates"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              placeholder="e.g. India"
              id="country"
            />

            <Input
              label="Hazard Magnitude"
              type="number"
              step="0.1"
              value={magnitude}
              onChange={(e) => setMagnitude(e.target.value)}
              required
              placeholder="e.g. 4.5"
              id="magnitude"
            />

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
          ) : !hasResults ? (
            <div className="bg-bg-secondary border border-border-custom border-dashed rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center text-text-muted">
              <Cpu className="h-8 w-8 text-text-muted mb-3" />
              <p className="font-bold text-xs">AWAITING SIMULATOR INGESTION</p>
              <p className="text-[10px] text-text-secondary max-w-xs mt-1">Configure model parameters and run forecast calculations to compile EOC indicators.</p>
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-6">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4.5 w-4.5 text-accent-secondary" />
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">EOC Forecast Matrix</span>
                </div>
                <SeverityBadge severity="extreme" />
              </div>

              {/* Multi-Output Targets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Expected Fatalities</span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">42</div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Displaced Population</span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">145,000</div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
                <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 text-center">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Adjusted economic Loss</span>
                  <div className="text-2xl font-bold font-mono text-text-primary mt-2">$1.45M</div>
                  <p className="text-[9px] text-text-muted mt-1">XGBoost Regressor Output</p>
                </div>
              </div>

              {/* Confidence & Risk Scale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border-custom pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase select-none">
                    <span>Forecast Confidence</span>
                    <span className="font-mono">89.2%</span>
                  </div>
                  <div className="h-3 w-full bg-border-custom rounded-full overflow-hidden">
                    <div className="h-full bg-accent-primary rounded-full" style={{ width: "89.2%" }}></div>
                  </div>
                  <p className="text-[9px] text-text-muted">Calculated relative to historical regional training density.</p>
                </div>

                <div className="flex items-center gap-4 bg-bg-primary/40 p-4 border border-border-custom rounded-xl select-none">
                  {/* Mock Circular Risk Gauge */}
                  <div className="relative h-12 w-12 flex items-center justify-center bg-bg-secondary rounded-full border-2 border-severity-extreme text-xs font-bold font-mono text-text-primary">
                    82
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider block">Risk Score Gauge</span>
                    <span className="text-[9px] text-text-secondary">Extreme hazard potential flagged.</span>
                  </div>
                </div>
              </div>

              {/* SHAP Contribution Bars (Section 16) */}
              <div className="border-t border-border-custom pt-4 space-y-3 select-none">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary font-mono">SHAP Feature Driver Analysis</h4>
                  <p className="text-[9px] text-text-secondary mt-0.5">Top contributors push/pull forecasted economic damages.</p>
                </div>
                <div className="space-y-2 font-mono text-[10px]">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-text-secondary">Magnitude</span>
                    <div className="flex-1 h-3 bg-border-custom rounded-xs overflow-hidden flex">
                      <div className="h-full bg-severity-extreme" style={{ width: "65%" }}></div>
                    </div>
                    <span className="w-10 text-right font-bold text-severity-extreme">+0.48</span>
                  </div>
                  {/* Feature 2 */}
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-text-secondary">Region Density</span>
                    <div className="flex-1 h-3 bg-border-custom rounded-xs overflow-hidden flex">
                      <div className="h-full bg-severity-extreme" style={{ width: "35%" }}></div>
                    </div>
                    <span className="w-10 text-right font-bold text-severity-extreme">+0.22</span>
                  </div>
                  {/* Feature 3 */}
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-text-secondary">Target Encoding</span>
                    <div className="flex-1 h-3 bg-border-custom rounded-xs overflow-hidden flex justify-end">
                      <div className="h-full bg-severity-low" style={{ width: "15%" }}></div>
                    </div>
                    <span className="w-10 text-right font-bold text-severity-low">-0.08</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
