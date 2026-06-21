"use client";

import React, { useState } from "react";
import { Search, Compass, ShieldAlert } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface SimilarMatch {
  disNo: string;
  year: number;
  country: string;
  type: string;
  magnitude: number;
  deaths: number;
  similarity: number;
  severity: string;
}

export default function SimilarityPage() {
  const [queryCode, setQueryCode] = useState("");
  const [matches, setMatches] = useState<SimilarMatch[]>([
    { disNo: "2018-0402-PHL", year: 2018, country: "Philippines", type: "Earthquake", magnitude: 6.9, deaths: 18, similarity: 96.8, severity: "High" },
    { disNo: "2021-0091-JPN", year: 2021, country: "Japan", type: "Earthquake", magnitude: 7.1, deaths: 4, similarity: 92.4, severity: "High" },
    { disNo: "2015-0210-NPL", year: 2015, country: "Nepal", type: "Earthquake", magnitude: 7.8, deaths: 8900, similarity: 89.1, severity: "Critical" },
    { disNo: "2023-0112-TUR", year: 2023, country: "Turkey", type: "Earthquake", magnitude: 7.5, deaths: 50780, similarity: 85.5, severity: "Critical" },
    { disNo: "2020-0504-GRC", year: 2020, country: "Greece", type: "Earthquake", magnitude: 6.7, deaths: 2, similarity: 81.2, severity: "Moderate" }
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate lookup reload
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Historical Similarity Matcher</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Query EM-DAT to locate analogous disaster profiles utilizing vector cosine-similarity estimators.
          </p>
        </div>
      </div>

      {/* Input search panel */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input
            label="Reference Event Code"
            placeholder="e.g. 2026-0012-IND"
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value)}
            id="query-code"
          />
          <Select label="Distance Function" id="dist-func">
            <option>Cosine Metric</option>
            <option>Euclidean Distance</option>
            <option>Manhattan Metric</option>
          </Select>
          <Button type="submit" className="flex items-center gap-1.5">
            <Search className="h-4 w-4" /> Compute Matches
          </Button>
        </form>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary select-none">Analog Results (Top 5 Matches)</h3>
        <div className="grid grid-cols-1 gap-3">
          {matches.map((m, idx) => (
            <div 
              key={idx}
              className="bg-bg-secondary border border-border-custom rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-text-primary">{m.country} ({m.year})</span>
                  <SeverityBadge severity={m.severity} />
                </div>
                <div className="text-[10px] text-text-secondary font-mono flex items-center gap-3">
                  <span>Code: {m.disNo}</span>
                  <span>•</span>
                  <span>Type: {m.type}</span>
                  <span>•</span>
                  <span>Magnitude: {m.magnitude}</span>
                  <span>•</span>
                  <span>Fatalities: {m.deaths.toLocaleString()}</span>
                </div>
              </div>

              {/* Similarity badge */}
              <div className="flex items-center gap-3 bg-bg-primary/40 border border-border-custom px-4 py-2 rounded-xl select-none">
                <Compass className="h-4 w-4 text-accent-secondary" />
                <div>
                  <span className="text-[11px] font-bold text-text-primary font-mono">{m.similarity}%</span>
                  <span className="block text-[8px] text-text-secondary uppercase font-semibold">Similarity</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
