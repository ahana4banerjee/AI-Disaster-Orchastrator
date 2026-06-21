"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, ShieldAlert, CheckCircle } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DisasterRecord[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortField, setSortField] = useState<"startDate" | "magnitude" | "deaths">("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // Mock records for fallback if backend server is not running
  const mockRecords: DisasterRecord[] = [
    { disNo: "2026-0012-IND", disasterType: "Cyclone", country: "India", region: "Odisha", magnitude: 4.2, startDate: "2026-06-15", severityClass: "Extreme", impact: { deaths: 42, economicDamageUSD: 1450000 } },
    { disNo: "2026-0013-PHL", disasterType: "Earthquake", country: "Philippines", region: "Luzon", magnitude: 6.8, startDate: "2026-06-10", severityClass: "High", impact: { deaths: 18, economicDamageUSD: 850000 } },
    { disNo: "2026-0014-USA", disasterType: "Wildfire", country: "United States", region: "California", magnitude: 5.0, startDate: "2026-06-08", severityClass: "Moderate", impact: { deaths: 3, economicDamageUSD: 2300000 } },
    { disNo: "2026-0015-KEN", disasterType: "Flood", country: "Kenya", region: "Garissa", magnitude: 3.5, startDate: "2026-06-01", severityClass: "High", impact: { deaths: 22, economicDamageUSD: 410000 } },
    { disNo: "2026-0016-COL", disasterType: "Landslide", country: "Colombia", region: "Antioquia", magnitude: 2.1, startDate: "2026-05-28", severityClass: "Moderate", impact: { deaths: 12, economicDamageUSD: 150000 } },
    { disNo: "2026-0017-JPN", disasterType: "Tsunami", country: "Japan", region: "Tohoku", magnitude: 7.2, startDate: "2026-05-20", severityClass: "Critical", impact: { deaths: 150, economicDamageUSD: 12500000 } },
    { disNo: "2026-0018-BGD", disasterType: "Flood", country: "Bangladesh", region: "Sylhet", magnitude: 3.8, startDate: "2026-05-15", severityClass: "High", impact: { deaths: 34, economicDamageUSD: 600000 } },
    { disNo: "2026-0019-ITA", disasterType: "Volcanic Activity", country: "Italy", region: "Sicily", magnitude: 4.8, startDate: "2026-05-10", severityClass: "Low", impact: { deaths: 0, economicDamageUSD: 50000 } }
  ];

  const fetchRecords = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem("token") || "";
      let url = `http://localhost:8000/api/v1/admin/records?page=${page}&limit=10`;
      if (countryFilter) url += `&country=${encodeURIComponent(countryFilter)}`;
      if (typeFilter) url += `&disasterType=${encodeURIComponent(typeFilter)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const result = await res.json();
        setRecords(result.data);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setStatusMessage({ text: "Database link active. Streaming telemetry records.", type: "success" });
      } else {
        throw new Error("API call failed");
      }
    } catch (err) {
      // Local filter fallback logic
      let filtered = [...mockRecords];
      if (countryFilter) {
        filtered = filtered.filter(r => r.country.toLowerCase().includes(countryFilter.toLowerCase()));
      }
      if (typeFilter) {
        filtered = filtered.filter(r => r.disasterType.toLowerCase() === typeFilter.toLowerCase());
      }
      
      // Sort
      filtered.sort((a, b) => {
        let valA: any = a[sortField as keyof DisasterRecord] || a.impact?.deaths || 0;
        let valB: any = b[sortField as keyof DisasterRecord] || b.impact?.deaths || 0;

        if (sortField === "deaths") {
          valA = a.impact.deaths;
          valB = b.impact.deaths;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      // Pagination Mocking
      const itemsPerPage = 5;
      const count = filtered.length;
      const pages = Math.ceil(count / itemsPerPage) || 1;
      const startIdx = (page - 1) * itemsPerPage;
      const sliced = filtered.slice(startIdx, startIdx + itemsPerPage);

      setRecords(sliced);
      setTotalPages(pages);
      setTotalCount(count);
      setStatusMessage({ text: "Backend offline. Running offline simulation dataset.", type: "info" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, countryFilter, typeFilter, sortField, sortOrder]);

  const handleSort = (field: "startDate" | "magnitude" | "deaths") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Disaster Records</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Filter, inspect, and manage disaster catalogs imported from the EM-DAT registry.
          </p>
        </div>
        {statusMessage && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[10px] font-mono font-bold select-none ${
            statusMessage.type === "success" 
              ? "bg-severity-low/10 text-severity-low border-severity-low/20" 
              : statusMessage.type === "info" 
              ? "bg-accent-purple/10 text-accent-purple border-accent-purple/20"
              : "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {statusMessage.text.toUpperCase()}
          </div>
        )}
      </div>

      {/* Filter Row Form */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Filter by Country"
          placeholder="e.g. India"
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value);
            setPage(1);
          }}
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
          <option value="Cyclone">Cyclone</option>
          <option value="Earthquake">Earthquake</option>
          <option value="Wildfire">Wildfire</option>
          <option value="Flood">Flood</option>
          <option value="Landslide">Landslide</option>
          <option value="Tsunami">Tsunami</option>
        </Select>

        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setCountryFilter("");
              setTypeFilter("");
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table Records Grid Canvas */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-text-muted space-y-2">
              <ShieldAlert className="h-8 w-8 text-text-muted mx-auto" />
              <p className="font-bold text-xs">NO DISASTER RECORDS FOUND</p>
              <p className="text-[10px] text-text-secondary">Verify filters or database configuration profiles.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="h-[60px] border-b border-border-custom bg-bg-secondary sticky top-0 z-10 select-none">
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Event Code</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Hazard</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Country</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Region</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <button onClick={() => handleSort("magnitude")} className="flex items-center gap-1 hover:text-text-primary">
                      Magnitude <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Severity</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <button onClick={() => handleSort("deaths")} className="flex items-center gap-1 hover:text-text-primary">
                      Fatalities <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Economic Damage</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <button onClick={() => handleSort("startDate")} className="flex items-center gap-1 hover:text-text-primary">
                      Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={record.id || record._id || index}
                    className="h-[56px] border-b border-border-custom hover:bg-bg-primary/40 transition duration-100 text-xs text-text-primary font-medium"
                  >
                    <td className="px-5 font-mono text-text-secondary">{record.disNo}</td>
                    <td className="px-5">{record.disasterType}</td>
                    <td className="px-5">{record.country}</td>
                    <td className="px-5 text-text-secondary">{record.region || "-"}</td>
                    <td className="px-5 font-mono">{record.magnitude ? record.magnitude.toFixed(1) : "-"}</td>
                    <td className="px-5">
                      <SeverityBadge severity={record.severityClass} />
                    </td>
                    <td className="px-5 font-mono text-text-secondary">
                      {record.impact?.deaths !== undefined ? record.impact.deaths.toLocaleString() : "0"}
                    </td>
                    <td className="px-5 font-mono text-text-secondary">
                      {record.impact?.economicDamageUSD !== undefined 
                        ? `$${(record.impact.economicDamageUSD / 1000).toLocaleString()}K` 
                        : "$0K"}
                    </td>
                    <td className="px-5 font-mono text-text-secondary">{formatDate(record.startDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Footer Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-bg-secondary border border-border-custom rounded-2xl p-4 shadow-xs select-none">
          <span className="text-[10px] font-bold text-text-secondary uppercase">
            Total Records: <span className="font-mono text-text-primary">{totalCount}</span>
          </span>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <span className="text-[11px] font-bold text-text-primary font-mono">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
