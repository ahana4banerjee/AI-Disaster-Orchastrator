"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, AlertTriangle, Loader2 } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

interface SimilarMatch {
  year: number;
  disasterType?: string;
  country: string;
  location: string;
  magnitude: number | null;
  deaths: number;
  affectedPopulation: number;
  economicDamageUSD: number;
  severityClass?: string;
  similarityPercentage: number;
}

export default function SimilarityPage() {
  const router = useRouter();
  const [disasterType, setDisasterType] = useState("Storm");
  const [country, setCountry] = useState("India");
  const [region, setRegion] = useState("Odisha");
  const [magnitude, setMagnitude] = useState("220");

  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/predict/similarity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disasterType,
          country: country.trim() || "India",
          region: region.trim() || "Global",
          magnitude: Math.max(0.1, parseFloat(magnitude) || 1.0),
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Similarity search request failed");
      }

      const data: SimilarMatch[] = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Unable to query historical similarity engine.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [disasterType, country, region, magnitude, router]);

  useEffect(() => {
    runSearch();
    // Run initial analog query once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Historical Similarity Matcher
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Query EM-DAT to locate analogous historical disaster profiles using cosine-similarity KNN estimators.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3 text-xs text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase block">Similarity Engine Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Input search panel */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Select
            label="Disaster Name / Type"
            value={disasterType}
            onChange={(e) => setDisasterType(e.target.value)}
            id="sim-disaster-type"
          >
            <option value="Storm">Storm / Cyclone</option>
            <option value="Earthquake">Earthquake</option>
            <option value="Flood">Flood</option>
            <option value="Wildfire">Wildfire</option>
            <option value="Landslide">Landslide</option>
            <option value="Drought">Drought</option>
          </Select>

          <Input
            label="Place (Country)"
            placeholder="e.g. India"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            id="sim-country"
          />

          <Input
            label="Place (Region / State)"
            placeholder="e.g. Odisha"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            id="sim-region"
          />

          <Input
            label="Magnitude"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="e.g. 220"
            value={magnitude}
            onChange={(e) => setMagnitude(e.target.value)}
            required
            id="sim-magnitude"
          />

          <Button type="submit" disabled={loading} className="flex items-center justify-center gap-1.5 h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Matching..." : "Compute Matches"}
          </Button>
        </form>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary select-none">
          Analog Results (Top {matches.length} Matches for {disasterType} in {country})
        </h3>

        {loading ? (
          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-10 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 text-accent-primary animate-spin" />
            <span className="text-xs font-mono text-text-secondary">
              Searching 16,789 EM-DAT vector records...
            </span>
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-8 text-center text-xs text-text-secondary">
            No matching historical analogs found for these parameters. Try adjusting the disaster type or magnitude.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {matches.map((m, idx) => (
              <div
                key={idx}
                className="bg-bg-secondary border border-border-custom rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-text-primary">
                      {m.country} ({m.year}) — {m.location || "Regional Event"}
                    </span>
                    <SeverityBadge severity={m.severityClass || "Moderate"} />
                  </div>
                  <div className="text-[10px] text-text-secondary font-mono flex flex-wrap items-center gap-3">
                    <span>Type: {m.disasterType || disasterType}</span>
                    <span>•</span>
                    <span>Magnitude: {m.magnitude !== null ? m.magnitude : "N/A"}</span>
                    <span>•</span>
                    <span>Fatalities: {m.deaths.toLocaleString()}</span>
                    <span>•</span>
                    <span>Affected: {m.affectedPopulation.toLocaleString()}</span>
                  </div>
                </div>

                {/* Similarity badge */}
                <div className="flex items-center gap-3 bg-bg-primary/40 border border-border-custom px-4 py-2 rounded-xl select-none">
                  <Compass className="h-4 w-4 text-accent-secondary" />
                  <div>
                    <span className="text-[11px] font-bold text-text-primary font-mono">
                      {m.similarityPercentage.toFixed(1)}%
                    </span>
                    <span className="block text-[8px] text-text-secondary uppercase font-semibold">
                      Similarity
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
