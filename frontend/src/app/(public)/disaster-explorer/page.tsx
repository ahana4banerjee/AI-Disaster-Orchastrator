"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Database,
  ArrowLeft,
  Calendar,
  Globe2,
  AlertTriangle,
  Heart,
  TrendingUp,
  Coins,
} from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface DisasterRecord {
  _id?: string;
  id?: string;
  disNo: string;
  disasterType: string;
  country: string;
  region: string;
  magnitude: number;
  startDate: string;
  severityClass: string;
  impact: {
    deaths: number;
    economicDamageUSD: number;
  };
}

export default function PublicDisasterExplorer() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DisasterRecord[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // High-density baseline records to fall back to if database/backend service is offline
  const fallbackRecords: DisasterRecord[] = [
    { disNo: "2026-0346-IRQ", disasterType: "Road Accident", country: "Iraq", region: "Muthanna", magnitude: 1.0, startDate: "2026-06-25", severityClass: "Moderate", impact: { deaths: 21, economicDamageUSD: 50000 } },
    { disNo: "2026-0347-MLT", disasterType: "Water Shortage", country: "Malta", region: "Gozo", magnitude: 12.5, startDate: "2026-06-22", severityClass: "Moderate", impact: { deaths: 10, economicDamageUSD: 450000 } },
    { disNo: "2026-0351-LKA", disasterType: "Fire", country: "Sri Lanka", region: "Western", magnitude: 2.0, startDate: "2026-06-20", severityClass: "Low", impact: { deaths: 12, economicDamageUSD: 80000 } },
    { disNo: "2026-0350-IND", disasterType: "Fire", country: "India", region: "Delhi", magnitude: 3.5, startDate: "2026-06-19", severityClass: "Moderate", impact: { deaths: 21, economicDamageUSD: 120000 } },
    { disNo: "2026-0348-USA", disasterType: "Storm", country: "United States", region: "Florida", magnitude: 130.0, startDate: "2026-06-15", severityClass: "High", impact: { deaths: 8, economicDamageUSD: 14500000 } },
    { disNo: "2026-0343-KEN", disasterType: "Flood", country: "Kenya", region: "Nairobi", magnitude: 45.0, startDate: "2026-06-10", severityClass: "High", impact: { deaths: 15, economicDamageUSD: 890000 } },
    { disNo: "2026-0341-CHN", disasterType: "Earthquake", country: "China", region: "Sichuan", magnitude: 6.2, startDate: "2026-06-05", severityClass: "Extreme", impact: { deaths: 45, economicDamageUSD: 23000000 } },
    { disNo: "2026-0339-IDN", disasterType: "Volcanic Activity", country: "Indonesia", region: "North Sulawesi", magnitude: 4.8, startDate: "2026-05-28", severityClass: "Moderate", impact: { deaths: 0, economicDamageUSD: 120000 } },
  ];

  const fetchRecords = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      let url = `http://localhost:8000/api/v1/public/disasters?page=${page}&limit=10`;
      if (countryFilter) url += `&country=${encodeURIComponent(countryFilter)}`;
      if (typeFilter) url += `&disasterType=${encodeURIComponent(typeFilter)}`;
      if (yearFilter) url += `&year=${encodeURIComponent(yearFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setRecords(result.data || []);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
        setStatusMessage({ text: "DATABASE LINK ACTIVE. STREAMING TELEMETRY RECORDS.", type: "success" });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      // Local failover caching filters mapping
      let filtered = [...fallbackRecords];
      if (countryFilter) {
        filtered = filtered.filter(r => r.country.toLowerCase().includes(countryFilter.toLowerCase()));
      }
      if (typeFilter) {
        filtered = filtered.filter(r => r.disasterType.toLowerCase() === typeFilter.toLowerCase());
      }
      if (yearFilter) {
        filtered = filtered.filter(r => r.startDate.startsWith(yearFilter));
      }

      setRecords(filtered);
      setTotalPages(Math.ceil(filtered.length / 10) || 1);
      setTotalCount(filtered.length);
      setStatusMessage({ text: "LOCAL FAILOVER ACTIVE. RENDERING OFFLINE CACHED DATA.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, countryFilter, typeFilter, yearFilter]);

  // Aggregate EOC Metric Cards data from visible records
  const totalDeaths = records.reduce((sum, r) => sum + (r.impact?.deaths || 0), 0);
  const avgDamage = records.length > 0 
    ? records.reduce((sum, r) => sum + (r.impact?.economicDamageUSD || 0), 0) / records.length
    : 0;
  const highSeverityCount = records.filter(r => 
    ["high", "extreme", "critical"].includes((r.severityClass || "").toLowerCase())
  ).length;

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none">
      
      {/* Top Breadcrumb row */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Disaster Explorer</span>
      </div>

      {/* System Status Indicators */}
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

      {/* High-Level EOC Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-5 border-l-4 border-l-accent-primary">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Historical Records</span>
            <Globe2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-text-primary tracking-tight">
            {loading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Total Search Matches</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-severity-extreme">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Severe Incidents</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-text-primary tracking-tight">
            {loading ? "..." : highSeverityCount}
          </p>
          <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Extreme & High Events</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-accent-teal">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Fatalities</span>
            <Heart className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-text-primary tracking-tight">
            {loading ? "..." : totalDeaths.toLocaleString()}
          </p>
          <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Sum Deaths in Page</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-severity-moderate">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Average Damage Cost</span>
            <Coins className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-text-primary tracking-tight">
            {loading ? "..." : `$${(avgDamage / 1000000).toFixed(2)}M`}
          </p>
          <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Economic USD Damage Average</p>
        </Card>
      </div>

      {/* Grid: Filters Panel & Main Datatable */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Search Filter Form Panel */}
        <Card className="lg:col-span-3 p-6 space-y-5 bg-bg-secondary border border-border-custom sticky top-[96px]">
          <div className="flex items-center gap-2 border-b border-border-custom pb-3 mb-2">
            <Calendar className="h-4 w-4 text-accent-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Query Filters
            </h3>
          </div>

          <div className="space-y-4">
            <Input
              label="Country"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Kenya, India"
              id="country-filter"
            />

            <Select
              label="Disaster Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              id="type-filter"
            >
              <option value="">All Hazards</option>
              <option value="Flood">Flood</option>
              <option value="Storm">Storm</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Landslide">Landslide</option>
              <option value="Volcanic Activity">Volcanic Activity</option>
              <option value="Drought">Drought</option>
              <option value="Wildfire">Wildfire</option>
              <option value="Fire">Fire</option>
            </Select>

            <Select
              label="Incident Year"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              id="year-filter"
            >
              <option value="">All Years</option>
              {Array.from({ length: 27 }).map((_, i) => {
                const y = 2026 - i;
                return (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                );
              })}
            </Select>
          </div>

          <Button
            variant="secondary"
            className="w-full text-[10px] font-bold uppercase tracking-wider mt-2"
            onClick={() => {
              setCountryFilter("");
              setTypeFilter("");
              setYearFilter("");
              setPage(1);
            }}
          >
            Clear Search
          </Button>
        </Card>

        {/* Right main table grid */}
        <div className="lg:col-span-9 space-y-6">
          <Card className="overflow-hidden border border-border-custom bg-bg-secondary">
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : records.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="h-10 w-10 text-text-muted mx-auto" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-tight text-text-primary">
                    No matching disasters logged
                  </h4>
                  <p className="text-xs text-text-muted max-w-[400px] mx-auto pt-1 leading-relaxed">
                    Verify spelling or refine filter metrics. EOC registry could not locate historical documents matching parameters.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-bg-primary border-b border-border-custom text-text-secondary uppercase font-bold tracking-wider text-[10px]">
                      <th className="p-4">DisNo</th>
                      <th className="p-4">Hazard</th>
                      <th className="p-4">Country</th>
                      <th className="p-4">Timeline</th>
                      <th className="p-4">Casualties</th>
                      <th className="p-4 text-center">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, index) => (
                      <tr
                        key={r.disNo || index}
                        className="border-b border-border-custom hover:bg-bg-primary/40 transition duration-150"
                      >
                        <td className="p-4 font-mono font-bold text-text-primary text-[11px] whitespace-nowrap">
                          {r.disNo}
                        </td>
                        <td className="p-4 font-semibold text-text-primary whitespace-nowrap">
                          {r.disasterType}
                        </td>
                        <td className="p-4 font-semibold text-text-secondary whitespace-nowrap">
                          {r.country}
                        </td>
                        <td className="p-4 font-semibold text-text-muted whitespace-nowrap">
                          {r.startDate}
                        </td>
                        <td className="p-4 font-mono font-semibold text-text-primary">
                          {r.impact?.deaths ? r.impact.deaths.toLocaleString() : "0"}
                        </td>
                        <td className="p-4 text-center">
                          <SeverityBadge severity={r.severityClass} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Pagination controls */}
          {records.length > 0 && (
            <div className="flex items-center justify-between font-semibold text-xs text-text-secondary select-none">
              <span className="text-[11px]">
                Showing page <span className="font-bold text-text-primary">{page}</span> of{" "}
                <span className="font-bold text-text-primary">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                  className="h-9 px-3 flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(page + 1)}
                  className="h-9 px-3 flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
