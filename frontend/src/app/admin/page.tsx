"use client";

import React from "react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">
          Intelligence Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Historical statistics, risk indicators, and record summaries.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Total Disasters", value: "16,800", change: "+1.2%", icon: "🌍" },
          { title: "Extreme Risk Events", value: "1,420", change: "+0.8%", icon: "🚨" },
          { title: "Average Mortality", value: "28.5", change: "-3.1%", icon: "💀" },
          { title: "Avg. Damages (USD)", value: "1.45M", change: "+2.4%", icon: "💰" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xs flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {stat.title}
              </p>
              <p className="text-2xl font-black text-white mt-2">{stat.value}</p>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block">
                {stat.change}
              </span>
            </div>
            <div className="text-3xl p-3 bg-slate-800/30 rounded-xl">{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Records List and Risk Index map placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Disaster Records Grid Table */}
        <div className="lg:col-span-2 bg-[#0d121f]/40 border border-slate-800/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Recent Historical Disaster Records</h3>
              <p className="text-xs text-slate-400 mt-1">
                EM-DAT event index logs.
              </p>
            </div>
            <button className="text-xs text-cyan-400 font-bold hover:underline cursor-pointer">
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-850 text-slate-450 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Casualties</th>
                  <th className="py-3 px-4">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {[
                  { code: "2026-0153-KEN", type: "Flood", country: "Kenya", date: "2026-03-06", deaths: 59, class: "Medium", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                  { code: "2025-0431-IND", type: "Storm", country: "India", date: "2025-10-12", deaths: 92, class: "High", color: "bg-red-500/20 text-red-300 border-red-500/30" },
                  { code: "2025-0211-ECU", type: "Earthquake", country: "Ecuador", date: "2025-06-15", deaths: 142, class: "Extreme", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
                ].map((record, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-mono text-xs text-cyan-400 font-bold">{record.code}</td>
                    <td className="py-3 px-4 text-white font-medium">{record.type}</td>
                    <td className="py-3 px-4">{record.country}</td>
                    <td className="py-3 px-4 text-slate-400">{record.date}</td>
                    <td className="py-3 px-4 font-bold">{record.deaths}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${record.color}`}>
                        {record.class}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spatial / Risk Map Box */}
        <div className="bg-[#0d121f]/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Regional Risk Clusters</h3>
            <p className="text-xs text-slate-400 mb-6">
              K-Means spatial vulnerability mapping.
            </p>
            <div className="h-48 bg-slate-950/80 rounded-xl border border-slate-850 flex items-center justify-center text-xs text-slate-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-cyan-500/5 to-transparent"></div>
              <span>🗺️ Geographical Radar Map View</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-850 flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Total Clusters</span>
            <span className="text-indigo-400">4 Risk Categories</span>
          </div>
        </div>
      </div>
    </div>
  );
}
