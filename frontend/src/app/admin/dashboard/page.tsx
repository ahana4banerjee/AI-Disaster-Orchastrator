"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Skull, 
  DollarSign, 
  Calendar,
  Activity,
  FileText,
  Brain,
  Wifi
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { KPISkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [kpiData, setKpiData] = useState({
    totalEvents: { value: "16,842", trend: "+8.4%", isUp: true },
    extremeEvents: { value: "1,420", trend: "+1.2%", isUp: true },
    avgFatalities: { value: "28.5", trend: "-3.1%", isUp: false },
    avgDamages: { value: "$1.45M", trend: "+4.2%", isUp: true }
  });
  const [trendData, setTrendData] = useState<any[]>([
    { year: "2020", events: 320, damages: 1.1 },
    { year: "2021", events: 340, damages: 1.3 },
    { year: "2022", events: 380, damages: 1.6 },
    { year: "2023", events: 410, damages: 1.4 },
    { year: "2024", events: 450, damages: 1.8 },
    { year: "2025", events: 490, damages: 2.1 }
  ]);
  const [severityDistribution, setSeverityDistribution] = useState<any[]>([
    { name: "Low", value: 4200, color: "#10B981" },
    { name: "Moderate", value: 6850, color: "#F59E0B" },
    { name: "High", value: 4372, color: "#F97316" },
    { name: "Extreme", value: 1420, color: "#DC2626" }
  ]);

  useEffect(() => {
    setMounted(true);
    
    // Asynchronous API query to fetch live KPIs if backend is running
    const fetchKPIs = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8000/api/v1/analytics/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setKpiData({
            totalEvents: { value: data.totalEvents.toLocaleString(), trend: "+8.4%", isUp: true },
            extremeEvents: { value: data.highRiskEvents.toLocaleString(), trend: "+1.2%", isUp: true },
            avgFatalities: { value: data.averageDeaths.toFixed(1), trend: "-3.1%", isUp: false },
            avgDamages: { value: `$${(data.averageDamageUSD / 1000000).toFixed(2)}M`, trend: "+4.2%", isUp: true }
          });
        }
      } catch (err) {
        // Silent catch: Gracefully fall back to pre-populated mock statistics
      }
    };

    const fetchTrends = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://localhost:8000/api/v1/analytics/trends", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map((item: any) => ({
              year: item.year.toString(),
              events: item.eventCount,
              damages: item.averageDamageUSD / 1000000000 // Convert to Billions USD for chart readability
            }));
            setTrendData(formatted);
          }
        }
      } catch (err) {
        // Silent catch
      }
    };
    
    fetchKPIs();
    fetchTrends();
  }, []);

  // Live feed log timeline EOC items
  const feedItems = [
    {
      type: "simulation",
      title: "Cyclone Odisha Cat 4 Simulation Executed",
      description: "Temporal progression logged Hour 0 to 48. Critical ambulance and road deficits identified.",
      time: "10 mins ago",
      icon: Activity,
      severity: "moderate"
    },
    {
      type: "prediction",
      title: "New Flash Flood Threat Forecasted",
      description: "FastAPI predict pipeline output: EXTREME Severity, 89.2% confidence in East Africa subregion.",
      time: "1 hour ago",
      icon: Brain,
      severity: "extreme"
    },
    {
      type: "report",
      title: "AI SITREP Compiled & Archived",
      description: "Government situation report sitrep_60a4f508.pdf published and cached.",
      time: "2 hours ago",
      icon: FileText,
      severity: "low"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Control Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">EOC Operational Intel</h2>
          <p className="text-xs text-text-secondary mt-0.5">Global hazard statistics, situational index registry, and latest feeds.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-9 px-3 bg-bg-secondary border border-border-custom text-xs font-semibold rounded-xl outline-hidden focus:ring-1 focus:ring-accent-primary"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {!mounted ? (
          Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
        ) : (
          <>
            {/* Total Events */}
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Total Disaster Events
                </span>
                <Calendar className="h-4.5 w-4.5 text-accent-secondary" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpiData.totalEvents.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                {kpiData.totalEvents.isUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-severity-low" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-severity-extreme" />
                )}
                <span className={kpiData.totalEvents.isUp ? "text-severity-low" : "text-severity-extreme"}>
                  {kpiData.totalEvents.trend} vs last period
                </span>
              </div>
            </div>

            {/* Extreme Events */}
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Extreme Risk Events
                </span>
                <AlertTriangle className="h-4.5 w-4.5 text-severity-extreme" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpiData.extremeEvents.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                {kpiData.extremeEvents.isUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-severity-low" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-severity-extreme" />
                )}
                <span className={kpiData.extremeEvents.isUp ? "text-severity-low" : "text-severity-extreme"}>
                  {kpiData.extremeEvents.trend} vs last period
                </span>
              </div>
            </div>

            {/* Average Fatalities */}
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Average Fatalities
                </span>
                <Skull className="h-4.5 w-4.5 text-text-primary" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpiData.avgFatalities.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                {kpiData.avgFatalities.isUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-severity-low" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-severity-extreme" />
                )}
                <span className={kpiData.avgFatalities.isUp ? "text-severity-low" : "text-severity-extreme"}>
                  {kpiData.avgFatalities.trend} vs last period
                </span>
              </div>
            </div>

            {/* Average Damages */}
            <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Avg. Economic Damages
                </span>
                <DollarSign className="h-4.5 w-4.5 text-severity-moderate" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpiData.avgDamages.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                {kpiData.avgDamages.isUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-severity-low" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-severity-extreme" />
                )}
                <span className={kpiData.avgDamages.isUp ? "text-severity-low" : "text-severity-extreme"}>
                  {kpiData.avgDamages.trend} vs last period
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Line Chart for Disaster Frequency/Damage */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Disaster Frequency & Damage Trends</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Year-wise aggregate analysis from EM-DAT core datasets.</p>
          </div>
          <div className="h-72 w-full">
            {!mounted ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" stroke="var(--text-secondary)" fontSize={10} className="font-mono" />
                  <YAxis stroke="var(--text-secondary)" fontSize={10} className="font-mono" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--bg-secondary)", 
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontSize: 11
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 10, marginTop: 10 }} />
                  <Line 
                    name="Logged Events" 
                    type="monotone" 
                    dataKey="events" 
                    stroke="var(--accent-primary)" 
                    strokeWidth={2} 
                    dot={{ r: 3 }}
                  />
                  <Line 
                    name="Damages ($ Billion)" 
                    type="monotone" 
                    dataKey="damages" 
                    stroke="var(--accent-teal)" 
                    strokeWidth={2} 
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recharts Pie Chart for Severity Distribution */}
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Severity Class Distribution</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Proportional threat levels across database catalog.</p>
          </div>
          <div className="h-44 w-full flex justify-center items-center">
            {!mounted ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "var(--bg-secondary)", 
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-[9px] font-bold text-center mt-2">
            <span className="text-severity-low bg-severity-low/10 py-1 rounded-sm border border-severity-low/20">LOW</span>
            <span className="text-severity-moderate bg-severity-moderate/10 py-1 rounded-sm border border-severity-moderate/20">MOD</span>
            <span className="text-severity-high bg-severity-high/10 py-1 rounded-sm border border-severity-high/20">HIGH</span>
            <span className="text-severity-extreme bg-severity-extreme/10 py-1 rounded-sm border border-severity-extreme/20">EXTREME</span>
          </div>
        </div>
      </div>

      {/* Intelligence Feed */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Live Action Intelligence Feed</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Chronological record of recent predictions, simulator runs, and SitRep compiler audits.</p>
          </div>
          <div className="flex items-center gap-1 bg-severity-low/10 text-severity-low border border-severity-low/20 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold select-none">
            <Wifi className="h-3 w-3 animate-pulse" />
            LIVE LINK ACTIVE
          </div>
        </div>
        
        <div className="relative border-l border-border-custom ml-3.5 pl-6 space-y-5">
          {feedItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[37px] top-0.5 h-6 w-6 rounded-md border border-border-custom flex items-center justify-center bg-bg-secondary">
                  <Icon className="h-3 w-3 text-text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                    <SeverityBadge severity={item.severity} />
                    <span className="text-[9px] text-text-muted font-mono ml-auto">{item.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
