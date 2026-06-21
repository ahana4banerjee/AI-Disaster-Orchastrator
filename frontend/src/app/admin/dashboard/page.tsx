"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Skull, 
  DollarSign, 
  Calendar,
  Activity,
  FileText,
  BrainCircuit
} from "lucide-react";

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("30d");

  // KPI Stat Data
  const kpiStats = [
    {
      title: "Total Disaster Events",
      value: "16,842",
      trend: "+8.4% vs last period",
      isUp: true,
      icon: Calendar,
      color: "text-accent-secondary"
    },
    {
      title: "Extreme Risk Events",
      value: "1,420",
      trend: "+1.2% vs last period",
      isUp: true,
      icon: AlertTriangle,
      color: "text-severity-extreme"
    },
    {
      title: "Average Fatalities",
      value: "28.5",
      trend: "-3.1% vs last period",
      isUp: false,
      icon: Skull,
      color: "text-text-primary"
    },
    {
      title: "Avg. Damages (USD)",
      value: "$1.45M",
      trend: "+4.2% vs last period",
      isUp: true,
      icon: DollarSign,
      color: "text-severity-moderate"
    }
  ];

  // Mock Intelligence Feed
  const feedItems = [
    {
      type: "simulation",
      title: "Cyclone Odisha Cat 4 Simulation Executed",
      description: "Temporal progression logged Hour 0 to 48. Critical ambulance and road deficits identified.",
      time: "10 mins ago",
      icon: Activity,
      color: "bg-accent-primary/20 text-accent-primary"
    },
    {
      type: "prediction",
      title: "New Flash Flood Threat Forecasted",
      description: "FastAPI predict pipeline output: EXTREME Severity, 89.2% confidence in East Africa subregion.",
      time: "1 hour ago",
      icon: BrainCircuit,
      color: "bg-severity-extreme/20 text-severity-extreme"
    },
    {
      type: "report",
      title: "AI SITREP Compiled & Archived",
      description: "Government situation report sitrep_60a4f508.pdf published and cached.",
      time: "2 hours ago",
      icon: FileText,
      color: "bg-accent-teal/20 text-accent-teal"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Control bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">EOC Operational Intel</h2>
          <p className="text-xs text-text-secondary mt-0.5">Global hazard statistics, situational index registry, and latest feeds.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-9 px-3 bg-bg-secondary border border-border-custom text-xs font-semibold rounded-lg outline-hidden focus:ring-1 focus:ring-accent-primary"
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
        {kpiStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  {stat.title}
                </span>
                <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono tracking-tight text-text-primary">
                  {stat.value}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold">
                {stat.isUp ? (
                  <TrendingUp className="h-3 w-3 text-severity-low" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-severity-extreme" />
                )}
                <span className={stat.isUp ? "text-severity-low" : "text-severity-extreme"}>
                  {stat.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disaster Trend Chart Panel Placeholder */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Disaster Frequency & Damage Trends</h3>
              <p className="text-[10px] text-text-secondary mt-0.5">Year-wise aggregate data analysis from EM-DAT registry.</p>
            </div>
          </div>
          <div className="h-72 bg-bg-primary/50 rounded-lg border border-border-custom border-dashed flex items-center justify-center text-xs text-text-muted">
            <span className="font-mono">📈 [Trends Recharts Container - Awaiting Ingestion Inputs]</span>
          </div>
        </div>

        {/* Severity Distribution Pie Placeholder */}
        <div className="bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Severity Class Distribution</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Proportional analysis of Low, Med, High, Extreme risk levels.</p>
          </div>
          <div className="h-44 bg-bg-primary/50 rounded-lg border border-border-custom border-dashed flex items-center justify-center text-xs text-text-muted">
            <span className="font-mono">📊 [Pie Chart Visualization]</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[9px] font-bold text-center mt-2">
            <span className="text-severity-low bg-severity-low/10 py-1 rounded-sm border border-severity-low/20">LOW</span>
            <span className="text-severity-moderate bg-severity-moderate/10 py-1 rounded-sm border border-severity-moderate/20">MOD</span>
            <span className="text-severity-high bg-severity-high/10 py-1 rounded-sm border border-severity-high/20">HIGH</span>
            <span className="text-severity-extreme bg-severity-extreme/10 py-1 rounded-sm border border-severity-extreme/20">EXTREME</span>
          </div>
        </div>
      </div>

      {/* Intelligence Feed Panel (Section 10) */}
      <div className="bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider">Live Action Intelligence Feed</h3>
          <p className="text-[10px] text-text-secondary mt-0.5">Chronological record of recent predictions, simulator runs, and SitRep compiler audits.</p>
        </div>
        
        <div className="relative border-l border-border-custom ml-3.5 pl-6 space-y-5">
          {feedItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="relative group">
                {/* Timeline dot */}
                <div className={`absolute -left-[35px] top-0.5 h-6 w-6 rounded-md border border-border-custom flex items-center justify-center bg-bg-secondary ${item.color}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                    <span className="text-[9px] text-text-muted font-mono">{item.time}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 max-w-2xl">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
