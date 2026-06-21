"use client";

import React from "react";
import { Truck, ShieldAlert, CheckCircle } from "lucide-react";

interface ResourceRow {
  name: string;
  required: number;
  available: number;
  deficit: number;
  status: "Deficit Alert" | "Stockpile OK";
}

export default function ResourcesPage() {
  const resourceLines: ResourceRow[] = [
    { name: "Ambulance Transport Units", required: 12, available: 6, deficit: -6, status: "Deficit Alert" },
    { name: "Mobile Rescue Boats", required: 4, available: 4, deficit: 0, status: "Stockpile OK" },
    { name: "Backup Generators (50kW)", required: 20, available: 15, deficit: -5, status: "Deficit Alert" },
    { name: "Emergency Rations (Boxes)", required: 500, available: 600, deficit: 0, status: "Stockpile OK" },
    { name: "Potable Water Bladders", required: 50, available: 32, deficit: -18, status: "Deficit Alert" },
    { name: "Field ICU Beds", required: 15, available: 15, deficit: 0, status: "Stockpile OK" }
  ];

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Resource Planning</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Monitor and coordinate disaster logistics pipelines, stock balances, and supply deficits.
          </p>
        </div>
      </div>

      {/* Resource deficits Table */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border-custom bg-bg-primary/30 flex items-center gap-2">
          <Truck className="h-4.5 w-4.5 text-accent-secondary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono">Logistics Allocation Registry</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="h-[60px] border-b border-border-custom bg-bg-secondary text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                <th className="px-5">Logistical Resource</th>
                <th className="px-5 text-right w-32">Required Units</th>
                <th className="px-5 text-right w-32">Available Stock</th>
                <th className="px-5 text-right w-32">Deficit Margin</th>
                <th className="px-5 w-44">Status Code</th>
              </tr>
            </thead>
            <tbody>
              {resourceLines.map((row, idx) => {
                const isDeficit = row.deficit < 0;
                return (
                  <tr
                    key={idx}
                    className={`h-[56px] border-b border-border-custom hover:bg-bg-primary/40 transition duration-100 text-xs text-text-primary font-medium ${
                      isDeficit ? "bg-severity-extreme/[0.03]" : ""
                    }`}
                  >
                    <td className="px-5 font-bold">{row.name}</td>
                    <td className="px-5 text-right font-mono text-text-secondary">{row.required}</td>
                    <td className="px-5 text-right font-mono text-text-secondary">{row.available}</td>
                    <td className={`px-5 text-right font-mono font-bold ${
                      isDeficit ? "text-severity-extreme" : "text-severity-low"
                    }`}>
                      {row.deficit === 0 ? "0" : row.deficit}
                    </td>
                    <td className="px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                        isDeficit 
                          ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20" 
                          : "bg-severity-low/10 text-severity-low border-severity-low/20"
                      }`}>
                        {isDeficit ? <ShieldAlert className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
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
    </div>
  );
}
