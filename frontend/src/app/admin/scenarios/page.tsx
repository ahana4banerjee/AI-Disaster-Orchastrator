"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Search,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  FolderOpen,
  ArrowRight,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface TimelineParameters {
  durationHours: number;
  cascadingIntervalHours: number;
}

interface Scenario {
  _id: string;
  name: string;
  description: string;
  disasterType: string;
  disasterSubtype: string;
  country: string;
  iso: string;
  region: string;
  magnitude: number;
  magnitudeScale: string;
  timelineParameters: TimelineParameters;
  notes: string;
  tags: string[];
  status: "Draft" | "Published";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const DISASTER_TYPES = [
  "Flood",
  "Earthquake",
  "Storm",
  "Wildfire",
  "Drought",
  "Landslide",
  "Volcanic Activity",
];

const MOCK_SCENARIOS: Scenario[] = [
  {
    _id: "60a4f5f5f5f5f5f5f5f5f503",
    name: "Cyclone Odisha Baseline (Category 4 Equivalent)",
    description: "Base template for hurricane preparedness simulations on the east coast.",
    disasterType: "Storm",
    disasterSubtype: "Tropical cyclone",
    country: "India",
    iso: "IND",
    region: "Odisha",
    magnitude: 220.0,
    magnitudeScale: "Kph",
    timelineParameters: { durationHours: 48, cascadingIntervalHours: 12 },
    notes: "Requires high coastal shelter allocation.",
    tags: ["cyclone", "east-coast"],
    status: "Published",
    createdBy: "60a4f5f5f5f5f5f5f5f5f500",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "60a4f5f5f5f5f5f5f5f5f505",
    name: "Tana River Valley Inundation",
    description: "Severe seasonal flooding template for rural agricultural sectors.",
    disasterType: "Flood",
    disasterSubtype: "River flood",
    country: "Kenya",
    iso: "KEN",
    region: "Tana River",
    magnitude: 14.5,
    magnitudeScale: "Km2",
    timelineParameters: { durationHours: 72, cascadingIntervalHours: 24 },
    notes: "Focuses on evacuation routes displacement.",
    tags: ["river-flooding", "rural"],
    status: "Published",
    createdBy: "60a4f5f5f5f5f5f5f5f5f500",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function ScenariosLibrary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [search, setSearch] = useState("");
  const [disasterType, setDisasterType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      let url = `http://localhost:8000/api/v1/scenarios/?page=${page}&limit=6`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (disasterType) url += `&disasterType=${encodeURIComponent(disasterType)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      url += `&sort=${sortField}&order=-1`;

      const res = await fetch(url, {
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
        const data = await res.json();
        setScenarios(data.data);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch {
      // Local fallback if API is not active
      let filtered = [...MOCK_SCENARIOS];
      if (search) {
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (disasterType) {
        filtered = filtered.filter((s) => s.disasterType === disasterType);
      }
      if (statusFilter) {
        filtered = filtered.filter((s) => s.status === statusFilter);
      }
      setScenarios(filtered);
      setTotalPages(1);
      setTotalCount(filtered.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, [page, search, disasterType, statusFilter, sortField]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) return prev; // Max 4 comparisons
      return [...prev, id];
    });
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/scenarios/${id}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchScenarios();
      }
    } catch {
      // Handle mock duplication in UI if offline
      const source = scenarios.find((s) => s._id === id);
      if (source) {
        const copy: Scenario = {
          ...source,
          _id: Math.random().toString(),
          name: `${source.name} - Copy`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setScenarios((prev) => [copy, ...prev]);
        setTotalCount((prev) => prev + 1);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scenario template?")) return;
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/scenarios/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        fetchScenarios();
      }
    } catch {
      // Handle mock deletion if offline
      setScenarios((prev) => prev.filter((s) => s._id !== id));
      setTotalCount((prev) => prev - 1);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header controls bar */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent-primary" /> Scenario Library
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure, manage, and duplicate hypothetical disaster templates for cascading situation simulations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Link href={`/admin/scenarios/compare?scenarioIds=${selectedIds.join(",")}`}>
              <Button variant="primary" className="flex items-center gap-1.5 h-9 text-[11px] font-bold uppercase tracking-wider bg-accent-teal hover:bg-accent-teal/85">
                Compare Selected ({selectedIds.length}/4) <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
          <Link href="/admin/scenarios/new">
            <Button variant="primary" className="flex items-center gap-1.5 h-9 text-[11px] font-bold uppercase tracking-wider">
              <Plus className="h-4 w-4" /> Create Scenario
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and search control board */}
      <Card className="p-4 flex flex-wrap gap-4 items-center justify-between bg-bg-secondary border-border-custom">
        <div className="flex flex-1 flex-wrap gap-3 items-center min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates name or tags..."
              className="w-full h-10 pl-9.5 pr-4 bg-bg-primary border border-border-custom rounded-xl text-xs font-semibold text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
            />
          </div>

          {/* Disaster Type filter */}
          <select
            value={disasterType}
            onChange={(e) => setDisasterType(e.target.value)}
            className="h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs font-semibold text-text-secondary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
          >
            <option value="">All Hazards</option>
            {DISASTER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs font-semibold text-text-secondary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
          >
            <option value="">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-text-muted" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs font-semibold text-text-secondary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="name">Sort: Template Name</option>
            <option value="disasterType">Sort: Disaster Type</option>
          </select>
        </div>
      </Card>

      {/* Scenarios Grid Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((s) => (
            <Card key={s} className="h-56 p-6 border-border-custom bg-bg-secondary flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-bg-primary rounded-sm animate-pulse w-3/4"></div>
                <div className="h-3 bg-bg-primary rounded-sm animate-pulse w-1/2"></div>
                <div className="space-y-1 pt-2">
                  <div className="h-2.5 bg-bg-primary rounded-sm animate-pulse w-full"></div>
                  <div className="h-2.5 bg-bg-primary rounded-sm animate-pulse w-5/6"></div>
                </div>
              </div>
              <div className="h-8 bg-bg-primary rounded-md animate-pulse w-full mt-4"></div>
            </Card>
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <Card className="p-12 text-center border-border-custom bg-bg-secondary flex flex-col items-center justify-center space-y-4">
          <FolderOpen className="h-12 w-12 text-text-muted" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">No templates found</h3>
            <p className="text-xs text-text-secondary">
              No hypothetical disaster scenarios match your active search terms.
            </p>
          </div>
          <Button
            onClick={() => {
              setSearch("");
              setDisasterType("");
              setStatusFilter("");
            }}
            variant="outline"
            className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((sc) => {
            const isSelected = selectedIds.includes(sc._id);
            const isProcessing = actionLoading === sc._id;
            return (
              <Card
                key={sc._id}
                className={`bg-bg-secondary border transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[220px] ${
                  isSelected 
                    ? "border-accent-primary ring-1 ring-accent-primary/20" 
                    : "border-border-custom hover:border-text-muted/40"
                }`}
              >
                
                {/* Header Title area */}
                <div className="p-5 border-b border-border-custom bg-bg-primary/20 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      sc.status === "Published" 
                        ? "bg-accent-teal/10 text-accent-teal border-accent-teal/20" 
                        : "bg-text-muted/10 text-text-muted border-border-custom"
                    }`}>
                      {sc.status}
                    </span>
                    <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase line-clamp-1">
                      {sc.name}
                    </h3>
                    <p className="text-[10px] text-text-muted font-semibold">
                      {sc.disasterType} &bull; {sc.country || "Global"}
                    </p>
                  </div>

                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelect(sc._id)}
                    disabled={selectedIds.length >= 4 && !isSelected}
                    className="h-4.5 w-4.5 rounded border-border-custom text-accent-primary focus:ring-accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                    {sc.description || "No description provided for this hypothetical template."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border-custom/50 pt-3">
                    <div>
                      <span className="text-text-muted uppercase font-semibold">Magnitude:</span>
                      <span className="block font-bold font-mono text-text-primary">
                        {sc.magnitude} {sc.magnitudeScale}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted uppercase font-semibold">Timeline Limit:</span>
                      <span className="block font-bold font-mono text-text-primary">
                        {sc.timelineParameters?.durationHours} hrs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="px-5 py-3 border-t border-border-custom bg-bg-primary/10 flex items-center justify-between">
                  <div className="flex gap-2">
                    {sc.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[9px] font-semibold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border-custom">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 text-text-muted animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleDuplicate(sc._id)}
                          title="Duplicate Scenario"
                          className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <Link href={`/admin/scenarios/${sc._id}/edit`}>
                          <button
                            title="Edit Scenario"
                            className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-accent-primary transition cursor-pointer"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(sc._id)}
                          title="Delete Scenario"
                          className="p-1.5 rounded hover:bg-bg-primary text-severity-extreme/75 hover:text-severity-extreme transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination control panel */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-custom pt-4 select-none">
          <span className="text-[10px] text-text-secondary font-mono">
            Total Scenarios: {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold text-text-primary">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Botton advisory instructions */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex gap-3 select-none">
        <ShieldAlert className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-text-primary">EOC COMPARATIVE RULES:</span>{" "}
          <span className="text-text-secondary">
            Select up to 4 scenarios from the library cards above to run side-by-side impact predictions, mapping comparative deaths, damages, and resource supply chains.
          </span>
        </div>
      </div>

    </div>
  );
}
