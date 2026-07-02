"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ScenarioItem {
  id: string;
  name: string;
  disasterType: string;
  country: string;
  region: string;
  magnitude: number;
  magnitudeScale: string;
}

const MOCK_SCENARIOS: ScenarioItem[] = [
  {
    id: "60a4f5f5f5f5f5f5f5f5f503",
    name: "Cyclone Odisha Baseline (Category 4 Equivalent)",
    disasterType: "Storm",
    country: "India",
    region: "Odisha",
    magnitude: 220.0,
    magnitudeScale: "Kph",
  },
  {
    id: "60a4f5f5f5f5f5f5f5f5f505",
    name: "Tana River Valley Inundation",
    disasterType: "Flood",
    country: "Kenya",
    region: "Tana River",
    magnitude: 14.5,
    magnitudeScale: "Km2",
  },
];

export default function NewSimulationWizard() {
  const router = useRouter();

  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [simName, setSimName] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  useEffect(() => {
    const loadScenariosList = async () => {
      setLoadingScenarios(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8000/api/v1/scenarios?limit=50", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (res.ok) {
          const body = await res.json();
          // Map to match ScenarioItem attributes
          const items = (body.data || []).map((s: any) => ({
            id: s.id || s._id,
            name: s.name,
            disasterType: s.disasterType,
            country: s.country,
            region: s.region,
            magnitude: s.magnitude,
            magnitudeScale: s.magnitudeScale,
          }));
          setScenarios(items);
          if (items.length > 0) {
            setSelectedScenarioId(items[0].id);
          }
        } else {
          throw new Error("Failed to load scenario list");
        }
      } catch {
        // Fallback fallback if offline
        setScenarios(MOCK_SCENARIOS);
        setSelectedScenarioId(MOCK_SCENARIOS[0].id);
      } finally {
        setLoadingScenarios(false);
      }
    };

    loadScenariosList();
  }, []);

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) {
      setError("Please provide a name for this simulation run.");
      return;
    }
    if (!selectedScenarioId) {
      setError("Please select a base scenario template.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://localhost:8000/api/v1/simulations/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenarioId: selectedScenarioId,
          name: simName.trim(),
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (res.ok) {
        // Successfully initialized simulation! Redirect back to simulations main workspace dashboard
        router.push("/admin/simulation");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to initialize simulation in database.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
      setSubmitting(false);
    }
  };

  const selectedScenarioDetails = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-text-secondary select-none">
        <Link href="/admin/simulation" className="hover:text-accent-primary transition font-semibold">
          Simulation Engine
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary font-bold">New Simulation</span>
      </div>

      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent-primary" /> Initialize Simulation Run
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Clone a saved scenario configuration template and prepare timeline step parameters.
          </p>
        </div>
        <Link href="/admin/simulation">
          <Button variant="outline" className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="p-4 border-severity-extreme/20 bg-severity-extreme/5 flex gap-3 text-xs text-severity-extreme select-none">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block mb-0.5">Configuration error</span>
            <span>{error}</span>
          </div>
        </Card>
      )}

      {loadingScenarios ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center space-y-3 border-border-custom bg-bg-secondary select-none">
          <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
          <span className="text-xs text-text-secondary font-mono">Retrieving active scenarios templates...</span>
        </Card>
      ) : (
        <form onSubmit={handleStartSimulation} className="space-y-6">
          <Card className="p-6 border-border-custom bg-bg-secondary space-y-6">
            
            {/* Step 1: Scenario Configuration Metadata */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border-custom pb-2 select-none">
                <Layers className="h-4 w-4 text-accent-teal" />
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Simulation Parameters
                </h3>
              </div>

              {/* Simulation Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary select-none">
                  Exercise Name <span className="text-severity-extreme">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Active drills: Cyclone Odisha Baseline"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-hidden transition"
                />
                <span className="text-[9px] text-text-secondary select-none">
                  Provide an identifying label for EOC operational reference logs.
                </span>
              </div>

              {/* Base Scenario Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary select-none">
                  Select Base Scenario Template <span className="text-severity-extreme">*</span>
                </label>
                <select
                  required
                  value={selectedScenarioId}
                  onChange={(e) => setSelectedScenarioId(e.target.value)}
                  className="w-full h-10 px-2 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:border-accent-primary focus:outline-hidden transition cursor-pointer"
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.disasterType} &bull; {s.country})
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-text-secondary select-none">
                  Coordinates, hazard indices, and intensity values are cloned from this saved template.
                </span>
              </div>
            </div>

            {/* Step 2: Cloned Properties Preview panel */}
            {selectedScenarioDetails && (
              <div className="p-4 bg-bg-primary/50 border border-border-custom rounded-xl space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-accent-teal block select-none">
                  Cloned Template Preview parameters
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-secondary block select-none">Disaster Classification</span>
                    <span className="font-bold text-text-primary uppercase">{selectedScenarioDetails.disasterType}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-secondary block select-none font-sans">Simulated Location</span>
                    <span className="font-bold text-text-primary">
                      {selectedScenarioDetails.region || "Global Scope"}, {selectedScenarioDetails.country}
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-border-custom/50 pt-2 col-span-2 flex justify-between items-center">
                    <span className="text-[10px] text-text-secondary select-none">Simulated Physical Magnitude</span>
                    <span className="font-bold font-mono text-text-primary">
                      {selectedScenarioDetails.magnitude} {selectedScenarioDetails.magnitudeScale}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </Card>

          {/* Form Actions footer */}
          <div className="flex justify-end gap-3 select-none">
            <Link href="/admin/simulation">
              <Button type="button" variant="outline" className="h-10 text-[10px] font-bold uppercase tracking-wider">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
              className="h-10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Initializing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start Simulation Exercise
                </>
              )}
            </Button>
          </div>
        </form>
      )}
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
