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
  MapPin,
  ListFilter,
  Navigation,
} from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Timeline, TimelineItem } from "@/components/ui/Timeline";

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

interface NearbyRecord {
  disNo: string;
  disasterType: string;
  distanceKm: number;
  deaths: number;
}

export default function PublicDisasterExplorer() {
  const [activeTab, setActiveTab] = useState<"regional" | "geospatial">("regional");
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // --- TAB 1: REGIONAL DATABASE SEARCH STATE ---
  const [records, setRecords] = useState<DisasterRecord[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // --- TAB 2: GEOSPATIAL NEARBY SEARCH STATE ---
  const [longitude, setLongitude] = useState<number>(39.6);
  const [latitude, setLatitude] = useState<number>(-4.0);
  const [radiusKm, setRadiusKm] = useState<number>(500);
  const [limitNearby, setLimitNearby] = useState<number>(10);
  const [nearbyRecords, setNearbyRecords] = useState<NearbyRecord[]>([]);

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

  // Fetch Regional Records
  const fetchRegionalRecords = async () => {
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

  // Fetch Geospatial Nearby Records
  const fetchGeospatialRecords = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const url = `http://localhost:8000/api/v1/public/disasters/nearby?longitude=${longitude}&latitude=${latitude}&radiusKm=${radiusKm}&limit=${limitNearby}`;
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setNearbyRecords(result || []);
        setStatusMessage({ text: "GEOSPATIAL COORDINATES LINK ACTIVE. TELEMETRY RENDERED.", type: "success" });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      // Simulated nearby disaster lookup fallback (calculates mathematical distance based on coordinates)
      const simulated: NearbyRecord[] = fallbackRecords.map((r, i) => {
        // Rough coordinate simulation for default fallbacks
        const coords = [
          [44.0, 31.0], // Iraq
          [14.0, 36.0], // Malta
          [79.9, 6.9],  // Sri Lanka
          [77.2, 28.6], // India
          [-80.2, 25.7], // USA Florida
          [36.8, -1.2], // Kenya Nairobi
          [104.0, 30.6], // China Sichuan
          [124.8, 1.5]  // Indonesia
        ];
        const recordLon = coords[i]?.[0] || 0.0;
        const recordLat = coords[i]?.[1] || 0.0;
        
        // Approximate distance using simple formula
        const dLon = recordLon - longitude;
        const dLat = recordLat - latitude;
        const distance = Math.round(Math.sqrt(dLon * dLon + dLat * dLat) * 111.0 * 10) / 10;
        
        return {
          disNo: r.disNo,
          disasterType: r.disasterType,
          distanceKm: distance,
          deaths: r.impact?.deaths || 0
        };
      })
      .filter(r => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limitNearby);

      setNearbyRecords(simulated);
      setStatusMessage({ text: "LOCAL SPA-FAILOVER ACTIVE. SIMULATING COORDINATES DISTANCE.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "regional") {
      fetchRegionalRecords();
    } else {
      fetchGeospatialRecords();
    }
  }, [activeTab, page, countryFilter, typeFilter, yearFilter, longitude, latitude, radiusKm, limitNearby]);

  // Click on SVG Map Picker
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = x / rect.width;
    const pctY = y / rect.height;
    
    // Map X to Longitude (-180 to 180)
    const lon = Math.round((pctX * 360 - 180) * 10) / 10;
    // Map Y to Latitude (-90 to 90)
    const lat = Math.round((90 - pctY * 180) * 10) / 10;
    
    setLongitude(lon);
    setLatitude(lat);
  };

  // Convert Nearby records into Timeline format
  const timelineItems: TimelineItem[] = nearbyRecords.map((r) => ({
    key: r.disNo,
    title: `${r.disasterType} (${r.disNo})`,
    subtitle: `${r.distanceKm.toFixed(1)} km away`,
    badge: (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20 text-[9px] font-bold uppercase font-mono">
        Active Vector
      </span>
    ),
    content: (
      <div className="flex gap-4 uppercase font-semibold text-[10px] text-text-muted">
        <span>Fatalities: <strong className="text-text-primary">{r.deaths.toLocaleString()}</strong></span>
        <span>|</span>
        <span>Registry Code: <strong className="text-text-primary">EM-DAT</strong></span>
      </div>
    ),
  }));

  // Aggregate statistics for Regional Tab
  const totalDeaths = records.reduce((sum, r) => sum + (r.impact?.deaths || 0), 0);
  const avgDamage = records.length > 0 
    ? records.reduce((sum, r) => sum + (r.impact?.economicDamageUSD || 0), 0) / records.length
    : 0;
  const highSeverityCount = records.filter(r => 
    ["high", "extreme", "critical"].includes((r.severityClass || "").toLowerCase())
  ).length;

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none">
      
      {/* Top Breadcrumb Row */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Disaster Explorer</span>
      </div>

      {/* Telemetry Status Banner */}
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

      {/* Tabs Header Selection */}
      <div className="flex gap-2 border-b border-border-custom pb-px mb-8">
        <button
          onClick={() => setActiveTab("regional")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer -mb-px ${
            activeTab === "regional"
              ? "border-accent-primary text-accent-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <ListFilter className="h-4 w-4" /> Regional database query
        </button>
        <button
          onClick={() => setActiveTab("geospatial")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer -mb-px ${
            activeTab === "geospatial"
              ? "border-accent-primary text-accent-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Navigation className="h-4 w-4" /> Geospatial coordinates nearby search
        </button>
      </div>

      {/* --- TAB 1 CONTENT: REGIONAL DATABASE SEARCH --- */}
      {activeTab === "regional" && (
        <div className="space-y-8 animate-fadeIn">
          {/* EOC Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Filters */}
            <Card className="lg:col-span-3 p-6 space-y-5 bg-bg-secondary border border-border-custom sticky top-[96px]">
              <div className="flex items-center gap-2 border-b border-border-custom pb-3 mb-2">
                <Calendar className="h-4 w-4 text-accent-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Query Filters</h3>
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
                      <option key={y} value={y.toString()}>{y}</option>
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

            {/* Table */}
            <div className="lg:col-span-9 space-y-6">
              <Card className="overflow-hidden border border-border-custom bg-bg-secondary">
                {loading ? (
                  <TableSkeleton rows={8} cols={6} />
                ) : records.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <AlertTriangle className="h-10 w-10 text-text-muted mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight text-text-primary">No matching disasters logged</h4>
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
                        {records.map((r, idx) => (
                          <tr
                            key={r.disNo || idx}
                            className="border-b border-border-custom hover:bg-bg-primary/40 transition duration-150"
                          >
                            <td className="p-4 font-mono font-bold text-text-primary text-[11px] whitespace-nowrap">{r.disNo}</td>
                            <td className="p-4 font-semibold text-text-primary whitespace-nowrap">{r.disasterType}</td>
                            <td className="p-4 font-semibold text-text-secondary whitespace-nowrap">{r.country}</td>
                            <td className="p-4 font-semibold text-text-muted whitespace-nowrap">{r.startDate}</td>
                            <td className="p-4 font-mono font-semibold text-text-primary">{r.impact?.deaths ? r.impact.deaths.toLocaleString() : "0"}</td>
                            <td className="p-4 text-center"><SeverityBadge severity={r.severityClass} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Pagination */}
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
      )}

      {/* --- TAB 2 CONTENT: GEOSPATIAL NEARBY SEARCH --- */}
      {activeTab === "geospatial" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
          
          {/* Interactive SVG Locator Map Picker & Coordinate inputs */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 space-y-6 bg-bg-secondary border border-border-custom">
              <div className="flex items-center gap-2 border-b border-border-custom pb-3">
                <MapPin className="h-4 w-4 text-accent-primary animate-bounce" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Interactive Vector Locator Picker
                </h3>
              </div>

              {/* Pure SVG Coordinate Plot Map Widget */}
              <div className="relative border border-border-custom rounded-lg overflow-hidden bg-bg-primary h-[260px] select-none">
                <svg
                  className="w-full h-full cursor-crosshair"
                  onClick={handleMapClick}
                >
                  {/* Grid Lines */}
                  {/* Equator */}
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--color-border-custom)" strokeDasharray="4 4" strokeWidth="1" />
                  {/* Prime Meridian */}
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--color-border-custom)" strokeDasharray="4 4" strokeWidth="1" />

                  {/* Continent Shapes Mockup (Lightweight visual vectors) */}
                  <path
                    d="M 50 80 Q 80 50 120 70 T 200 60 Q 240 100 280 120 T 320 180 Q 260 220 220 200 T 150 240 Z"
                    fill="currentColor"
                    className="text-text-muted/5"
                  />
                  <path
                    d="M 380 90 Q 420 60 480 80 T 520 110 T 580 160 Q 520 210 460 200 Z"
                    fill="currentColor"
                    className="text-text-muted/5"
                  />

                  {/* Locator Coordinate Target Pointer Indicator */}
                  {(() => {
                    // Map lat/lon back to percentages
                    const pctX = (longitude + 180) / 360;
                    const pctY = (90 - latitude) / 180;
                    return (
                      <g className="transition-all duration-300">
                        {/* Target Crosshair */}
                        <circle cx={`${pctX * 100}%`} cy={`${pctY * 100}%`} r="12" fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" className="animate-pulse" />
                        <circle cx={`${pctX * 100}%`} cy={`${pctY * 100}%`} r="3" fill="var(--color-accent-primary)" />
                      </g>
                    );
                  })()}
                </svg>
                <div className="absolute bottom-2 left-2 bg-bg-secondary/90 border border-border-custom px-2 py-1 rounded text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono">
                  Click map to set coordinate
                </div>
              </div>

              {/* Text Input Coordinate Adjusters */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Longitude (-180 to 180)"
                  type="number"
                  step="0.01"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  id="longitude-input"
                />
                <Input
                  label="Latitude (-90 to 90)"
                  type="number"
                  step="0.01"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  id="latitude-input"
                />
              </div>

              {/* Sliders for Radius & Limits */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <label htmlFor="radius-slider" className="text-text-secondary">Search Radius</label>
                    <span className="text-accent-primary font-mono">{radiusKm} km</span>
                  </div>
                  <input
                    id="radius-slider"
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseInt(e.target.value) || 500)}
                    className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <label htmlFor="limit-slider" className="text-text-secondary">Maximum Results</label>
                    <span className="text-accent-primary font-mono">{limitNearby} matches</span>
                  </div>
                  <input
                    id="limit-slider"
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={limitNearby}
                    onChange={(e) => setLimitNearby(parseInt(e.target.value) || 10)}
                    className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Results: Nearby disasters timeline */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-bg-secondary border border-border-custom min-h-[460px] flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border-custom pb-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-accent-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Nearest Logged Incidents
                    </h3>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono uppercase font-bold tracking-wide">
                    Results: {nearbyRecords.length}
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-6 py-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-4 items-start animate-pulse">
                        <div className="h-3 w-3 bg-text-muted/10 rounded-full mt-1 shrink-0"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 w-40 bg-text-muted/10 rounded"></div>
                          <div className="h-2.5 w-60 bg-text-muted/10 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : nearbyRecords.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <AlertTriangle className="h-10 w-10 text-text-muted mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-tight text-text-primary">
                        No Nearby hazards located
                      </h4>
                      <p className="text-xs text-text-muted max-w-[320px] mx-auto pt-1 leading-relaxed">
                        No disaster documents were logged within the selected {radiusKm} km radius limit of coordinates ({longitude}, {latitude}).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Timeline items={timelineItems} emptyMessage="No nearby hazards located" />
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      )}

    </div>
  );
}
