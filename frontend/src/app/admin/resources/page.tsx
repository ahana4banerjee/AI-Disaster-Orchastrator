"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Truck,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sliders,
  Activity,
  Clock,
  RefreshCw,
  ArrowRight,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { useSimulationWebSocket } from "@/hooks/useSimulationWebSocket";

interface ResourceItem {
  key: string;
  type: string;
  unit: string;
  required: number;
  available: number;
  deficit: number;
  deficitPercentage: number;
  coveragePercentage: number;
  status: string;
  statusColor: "EMERALD" | "AMBER" | "CRIMSON";
  operationalImplication: string;
  infrastructureFactor?: string | null;
}

interface ResourceSummary {
  totalRequired: number;
  totalAvailable: number;
  totalDeficit: number;
  criticalCount: number;
  moderateCount: number;
  sufficientCount: number;
}

interface CriticalAlert {
  resourceType: string;
  severity: string;
  deficit: number;
  deficitPercentage: number;
  implication: string;
  infrastructureDriver?: string | null;
}

interface TimestepAssessment {
  step: number;
  hour: number;
  timeLabel: string;
  assessedAt: string;
  resources: ResourceItem[];
  summary: ResourceSummary;
  criticalAlerts: CriticalAlert[];
  deficitAnalysisSummary: string;
}

interface ResourceInventory {
  ambulances: number;
  rescueTeams: number;
  medicalTeams: number;
  reliefCamps: number;
  foodUnits: number;
}

interface ResourcePlan {
  _id?: string;
  id?: string;
  simulationId: string;
  simulationName?: string;
  assessmentDate: string;
  status: "In Progress" | "Finalized";
  inventory: ResourceInventory;
  resources: ResourceItem[];
  summary: ResourceSummary;
  criticalAlerts: CriticalAlert[];
  deficitAnalysisSummary: string;
  timestepAssessments: TimestepAssessment[];
}

interface SimulationListItem {
  _id?: string;
  id?: string;
  name: string;
  status: string;
  currentStep: number;
}

const TIMELINE_STEPS = [
  { step: 0, hour: 0, label: "Hour 0" },
  { step: 1, hour: 6, label: "Hour 6" },
  { step: 2, hour: 12, label: "Hour 12" },
  { step: 3, hour: 24, label: "Hour 24" },
  { step: 4, hour: 48, label: "Hour 48" },
];

function statusStyles(color: string) {
  switch (color) {
    case "EMERALD":
      return {
        badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
        bar: "bg-emerald-500",
        text: "text-emerald-500",
        row: "",
      };
    case "AMBER":
      return {
        badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
        bar: "bg-amber-500",
        text: "text-amber-500",
        row: "bg-amber-500/[0.02]",
      };
    case "CRIMSON":
    default:
      return {
        badge: "bg-red-500/10 text-red-500 border-red-500/30",
        bar: "bg-red-500",
        text: "text-red-500",
        row: "bg-red-500/[0.04]",
      };
  }
}

function ResourcesDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const simIdParam = searchParams.get("simulationId");

  const [mounted, setMounted] = useState(false);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(simIdParam);
  const [plan, setPlan] = useState<ResourcePlan | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showInventoryEditor, setShowInventoryEditor] = useState(false);
  const [inventoryDraft, setInventoryDraft] = useState<ResourceInventory>({
    ambulances: 35,
    rescueTeams: 12,
    medicalTeams: 10,
    reliefCamps: 15,
    foodUnits: 25000,
  });
  const [savingInventory, setSavingInventory] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSimulations = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/simulations/?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load simulations list");
      const data = await res.json();
      const items: SimulationListItem[] = data.data || [];
      setSimulations(items);

      if (simIdParam) {
        setSelectedSimId(simIdParam);
      } else if (items.length > 0 && !selectedSimId) {
        const firstId = items[0].id || items[0]._id || null;
        setSelectedSimId(firstId);
      }
    } catch (err: any) {
      setError(err.message || "Unable to fetch simulations.");
    } finally {
      setLoadingList(false);
    }
  }, [simIdParam, router, selectedSimId]);

  const fetchResourcePlan = useCallback(
    async (simId: string) => {
      setLoadingPlan(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/resources/simulations/${simId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || "Failed to load resource assessment plan");
        }
        const data: ResourcePlan = await res.json();
        setPlan(data);
        if (data.inventory) {
          setInventoryDraft(data.inventory);
        }
        if (data.timestepAssessments && data.timestepAssessments.length > 0) {
          const latestStep =
            data.timestepAssessments[data.timestepAssessments.length - 1].step;
          setActiveStep((prev) => (prev === null ? latestStep : prev));
        } else {
          setActiveStep(null);
        }
      } catch (err: any) {
        setError(err.message || "Error retrieving resource plan.");
        setPlan(null);
      } finally {
        setLoadingPlan(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  useEffect(() => {
    if (selectedSimId) {
      setActiveStep(null);
      fetchResourcePlan(selectedSimId);
    }
  }, [selectedSimId, fetchResourcePlan]);

  // Live WebSocket updates for active simulation
  const { isConnected } = useSimulationWebSocket(selectedSimId, (msg) => {
    if (
      msg.type === "RESOURCE_UPDATE" ||
      msg.type === "RESOURCE_FINALIZED" ||
      msg.type === "TIMESTEP_UPDATE" ||
      msg.type === "SIMULATION_COMPLETED"
    ) {
      if (selectedSimId) {
        fetchResourcePlan(selectedSimId);
        if (msg.data?.step !== undefined) {
          setActiveStep(msg.data.step);
        }
      }
    }
  });

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimId) return;
    setSavingInventory(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/resources/simulations/${selectedSimId}/inventory`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(inventoryDraft),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to update inventory");
      }
      const updated: ResourcePlan = await res.json();
      setPlan(updated);
      setShowInventoryEditor(false);
    } catch (err: any) {
      setError(err.message || "Error updating inventory.");
    } finally {
      setSavingInventory(false);
    }
  };

  // Determine active timestep view vs overall consolidated view
  const activeTimestep =
    activeStep !== null && plan?.timestepAssessments
      ? plan.timestepAssessments.find((t) => t.step === activeStep) || null
      : null;

  const displayedResources = activeTimestep ? activeTimestep.resources : plan?.resources || [];
  const displayedSummary = activeTimestep ? activeTimestep.summary : plan?.summary;
  const displayedAlerts = activeTimestep ? activeTimestep.criticalAlerts : plan?.criticalAlerts || [];
  const displayedNarrative = activeTimestep
    ? activeTimestep.deficitAnalysisSummary
    : plan?.deficitAnalysisSummary || "";

  const chartData = (plan?.timestepAssessments || []).map((t) => {
    const amb = t.resources.find((r) => r.key === "ambulances");
    const med = t.resources.find((r) => r.key === "medicalTeams");
    const res = t.resources.find((r) => r.key === "rescueTeams");
    const camps = t.resources.find((r) => r.key === "reliefCamps");
    return {
      name: `H${t.hour}`,
      Ambulances: amb?.required || 0,
      "Medical Teams": med?.required || 0,
      "Rescue Teams": res?.required || 0,
      "Relief Camps": camps?.required || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border-custom pb-4 select-none">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Resource Planning & Deficit Analyzer
            </h2>
            {plan && (
              <span
                className={`inline-flex items-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                  plan.status === "Finalized"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
              >
                {plan.status}
              </span>
            )}
            {selectedSimId && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {isConnected ? "Live Sync" : "Standby"}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Dynamic logistics requirements, EOC stockpile deficits, and infrastructure-adjusted response allocations.
          </p>
        </div>

        {/* Simulation Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {simulations.length > 0 && (
            <select
              value={selectedSimId || ""}
              onChange={(e) => setSelectedSimId(e.target.value)}
              className="h-9 px-3 bg-bg-secondary border border-border-custom rounded-lg text-xs text-text-primary focus:border-accent-primary focus:outline-hidden cursor-pointer max-w-[260px]"
            >
              {simulations.map((s) => {
                const sid = s.id || s._id || "";
                return (
                  <option key={sid} value={sid}>
                    {s.name} ({s.status})
                  </option>
                );
              })}
            </select>
          )}
          {selectedSimId && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={() => setShowInventoryEditor((prev) => !prev)}
              >
                <Sliders className="h-3.5 w-3.5" />
                {showInventoryEditor ? "Close Inventory" : "Update Stockpile"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={() => fetchResourcePlan(selectedSimId)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Link href={`/admin/simulation?id=${selectedSimId}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Simulation View
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 text-xs text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block">Resource Engine Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(loadingList || loadingPlan) && (
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
          <span className="text-xs font-mono text-text-secondary">
            Computing resource allocations and stockpile deficits...
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loadingList && simulations.length === 0 && (
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-12 text-center space-y-4">
          <Package className="h-10 w-10 text-text-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary">No Simulation Exercises Found</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Initialize and run a disaster simulation to generate dynamic resource recommendations and stockpile deficit analyses.
            </p>
          </div>
          <Link href="/admin/simulation/new">
            <Button variant="primary" size="sm" className="inline-flex items-center gap-1.5">
              Initialize Simulation <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Inventory Editor Drawer */}
      {showInventoryEditor && selectedSimId && (
        <form
          onSubmit={handleSaveInventory}
          className="bg-bg-secondary border border-accent-primary/30 rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-border-custom pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                EOC Available Stockpile Inventory
              </h3>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Supply actual regional warehouse counts to recalculate deficits across all simulation timesteps.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: "ambulances", label: "Ambulances (units)" },
              { key: "rescueTeams", label: "Rescue Teams" },
              { key: "medicalTeams", label: "Medical Teams" },
              { key: "reliefCamps", label: "Relief Camps" },
              { key: "foodUnits", label: "Food Units (rations)" },
            ].map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  {field.label}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={(inventoryDraft as any)[field.key]}
                  onChange={(e) =>
                    setInventoryDraft((prev) => ({
                      ...prev,
                      [field.key]: Math.max(0, parseInt(e.target.value || "0", 10)),
                    }))
                  }
                  className="w-full h-9 px-3 bg-bg-primary border border-border-custom rounded-lg text-xs font-mono text-text-primary focus:border-accent-primary focus:outline-hidden"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowInventoryEditor(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={savingInventory}>
              {savingInventory ? "Recalculating..." : "Save & Recalculate Deficits"}
            </Button>
          </div>
        </form>
      )}

      {/* Main Dashboard Content */}
      {!loadingPlan && plan && displayedSummary && (
        <>
          {/* A. Resource Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Total Resources Required
              </span>
              <div className="text-2xl font-bold font-mono text-text-primary">
                {displayedSummary.totalRequired.toLocaleString()}
              </div>
              <p className="text-[10px] text-text-muted">Aggregate units across 5 categories</p>
            </div>

            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Total Resources Available
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-500">
                {displayedSummary.totalAvailable.toLocaleString()}
              </div>
              <p className="text-[10px] text-text-muted">Active EOC stockpile inventory</p>
            </div>

            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Total Resource Deficit
              </span>
              <div
                className={`text-2xl font-bold font-mono ${
                  displayedSummary.totalDeficit > 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {displayedSummary.totalDeficit.toLocaleString()}
              </div>
              <p className="text-[10px] text-text-muted">Net shortfall requiring mobilization</p>
            </div>

            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Critically Deficient Categories
              </span>
              <div
                className={`text-2xl font-bold font-mono ${
                  displayedSummary.criticalCount > 0 ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {displayedSummary.criticalCount} / 5
              </div>
              <p className="text-[10px] text-text-muted">
                {displayedSummary.moderateCount} moderate &bull; {displayedSummary.sufficientCount} sufficient
              </p>
            </div>
          </div>

          {/* E. Timeline-Based Resource Analysis Selector */}
          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-custom pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Timeline-Based Resource Analysis
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {TIMELINE_STEPS.map((ts) => {
                  const computed = plan.timestepAssessments?.some((a) => a.step === ts.step);
                  const isSelected = activeStep === ts.step;
                  return (
                    <button
                      key={ts.step}
                      disabled={!computed}
                      onClick={() => setActiveStep(ts.step)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-accent-primary text-white border-accent-primary"
                          : computed
                          ? "bg-bg-primary text-text-primary border-border-custom hover:border-accent-primary"
                          : "bg-bg-primary text-text-muted border-border-custom"
                      }`}
                    >
                      {ts.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-text-secondary font-sans">{displayedNarrative}</p>

            {/* Timeline Resource Demand Chart */}
            {mounted && chartData.length > 0 && (
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#F8FAFC",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Ambulances" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Medical Teams" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Rescue Teams" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Relief Camps" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* B, C, D. Resource Allocation Table & Shortfall Progress Bars */}
          <div className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border-custom bg-bg-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4.5 w-4.5 text-accent-secondary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">
                  Logistics Allocation & Stockpile Coverage
                </h3>
              </div>
              {activeTimestep && (
                <span className="text-[10px] font-mono text-accent-secondary font-bold uppercase">
                  {activeTimestep.timeLabel}
                </span>
              )}
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse text-left min-w-[820px]">
                <thead>
                  <tr className="h-[52px] border-b border-border-custom bg-bg-secondary text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <th className="px-5">Resource</th>
                    <th className="px-5 text-right">Required</th>
                    <th className="px-5 text-right">Available</th>
                    <th className="px-5 text-right">Deficit</th>
                    <th className="px-5 w-52">Stockpile Coverage</th>
                    <th className="px-5 w-44">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedResources.map((row) => {
                    const st = statusStyles(row.statusColor);
                    return (
                      <tr
                        key={row.key}
                        className={`border-b border-border-custom hover:bg-bg-primary/40 transition duration-100 text-xs text-text-primary ${st.row}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-bold">{row.type}</div>
                          {row.infrastructureFactor && (
                            <div className="text-[10px] text-amber-500 mt-0.5">
                              {row.infrastructureFactor}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold">
                          {row.required.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-text-secondary">
                          {row.available.toLocaleString()}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-mono font-bold ${st.text}`}>
                          {row.deficit > 0 ? `-${row.deficit.toLocaleString()}` : "0"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-text-secondary">{row.coveragePercentage}%</span>
                              {row.deficitPercentage > 0 && (
                                <span className={st.text}>-{row.deficitPercentage}% gap</span>
                              )}
                            </div>
                            <div className="h-2 bg-bg-primary rounded-full border border-border-custom overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${st.bar}`}
                                style={{ width: `${row.coveragePercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${st.badge}`}
                          >
                            {row.statusColor === "EMERALD" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <ShieldAlert className="h-3 w-3" />
                            )}
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* F. Critical Shortage Alerts */}
          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Critical Shortage Alerts & Operational Implications
                </h3>
              </div>
              <span className="text-[10px] font-mono text-text-secondary">
                {displayedAlerts.length} critical alert(s)
              </span>
            </div>

            {displayedAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-500">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>No critical resource shortages detected at this timestep.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                        {alert.resourceType} — Critical Deficit
                      </span>
                      <span className="text-[10px] font-mono font-bold text-red-500">
                        -{alert.deficit.toLocaleString()} ({alert.deficitPercentage}% short)
                      </span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed">
                      {alert.implication}
                    </p>
                    {alert.infrastructureDriver && (
                      <p className="text-[10px] font-mono text-amber-500">
                        Driver: {alert.infrastructureDriver}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* G. Final Resource Assessment */}
          {plan.status === "Finalized" && (
            <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Consolidated Final Resource Assessment (Hour 48 Complete)
                </h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {plan.deficitAnalysisSummary}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {plan.resources.map((r) => {
                  const st = statusStyles(r.statusColor);
                  return (
                    <div
                      key={r.key}
                      className="p-3 bg-bg-secondary border border-border-custom rounded-xl space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase text-text-secondary block">
                        {r.type}
                      </span>
                      <div className="text-sm font-bold font-mono text-text-primary">
                        {r.required.toLocaleString()} req
                      </div>
                      <div className={`text-[10px] font-mono font-bold ${st.text}`}>
                        {r.deficit > 0 ? `Deficit: ${r.deficit.toLocaleString()}` : "Sufficient"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
          <span className="text-xs text-text-secondary font-mono">
            Loading Resource Planning Dashboard...
          </span>
        </div>
      }
    >
      <ResourcesDashboardContent />
    </Suspense>
  );
}
