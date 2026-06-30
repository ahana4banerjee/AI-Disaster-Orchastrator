"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  Database,
  AlertTriangle,
  CloudRain,
  Flame,
  Activity,
  Wind,
  Droplet,
  Mountain,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface HazardSummary {
  hazard: string;
  description: string;
  warningSigns: string[];
}

export default function DisasterAwarenessHub() {
  const [loading, setLoading] = useState(true);
  const [hazards, setHazards] = useState<HazardSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // High-fidelity fallback list if API database collection is empty/offline
  const fallbackHazards: HazardSummary[] = [
    {
      hazard: "flood",
      description: "Rapid accumulation of water in normally dry landmass areas, triggered by intense rainfall, storms, or dam failures.",
      warningSigns: ["Rising water levels", "Heavy rain", "Pooling water"],
    },
    {
      hazard: "earthquake",
      description: "Sudden release of geological energy along fault lines, producing strong ground shaking and structural shifts.",
      warningSigns: ["Rattling walls", "Pet alarms", "Minor tremors"],
    },
    {
      hazard: "storm",
      description: "Violent atmospheric disturbances characterized by high-velocity winds, lightning, hail, and heavy rainfall.",
      warningSigns: ["Dark wall clouds", "Gusting winds", "Severe thunder"],
    },
    {
      hazard: "wildfire",
      description: "Uncontrolled fires spreading rapidly across dry forest, brush, or woodland areas, threatening lives and properties.",
      warningSigns: ["Smoke plumes", "Smell of timber ash", "Rising wind temp"],
    },
    {
      hazard: "drought",
      description: "Extended periods of deficient rainfall resulting in water scarcity, crop damage, and ecological imbalances.",
      warningSigns: ["Low reservoir levels", "Dry soil cracks", "Water restrictions"],
    },
    {
      hazard: "landslide",
      description: "Downward movement of soil, rocks, and debris along slopes, triggered by heavy rain, seismic activity, or human construction.",
      warningSigns: ["Foundation cracks", "Tilted utility poles", "Rumbling sounds"],
    },
    {
      hazard: "volcano",
      description: "Release of molten rock, ash, and gases from underground chambers, producing lava flows, ash fall, and toxic gas clouds.",
      warningSigns: ["Volcanic earthquakes", "Ground deformation", "Steam plumes"],
    },
  ];

  const fetchHazards = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/public/awareness");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setHazards(data);
          setStatusMessage({ text: "AWARENESS REGISTRY LINK ACTIVE. GUIDES RETRIEVED.", type: "success" });
        } else {
          setHazards(fallbackHazards);
          setStatusMessage({ text: "REGISTRY SEEDING COMPILING. RENDERING OFFLINE CACHED TEMPLATES.", type: "warning" });
        }
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      setHazards(fallbackHazards);
      setStatusMessage({ text: "LOCAL SEED-FAILOVER ACTIVE. RENDERING OFFLINE AWARENESS GUIDES.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHazards();
  }, []);

  // Map hazard names to specific EOC icons and theme styling
  const getHazardMeta = (hazard: string) => {
    const norm = (hazard || "").toLowerCase().trim();
    switch (norm) {
      case "flood":
        return { icon: CloudRain, title: "Floods", color: "text-accent-primary" };
      case "earthquake":
        return { icon: Activity, title: "Earthquakes", color: "text-severity-extreme" };
      case "storm":
        return { icon: Wind, title: "Storms & Cyclones", color: "text-accent-teal" };
      case "wildfire":
        return { icon: Flame, title: "Wildfires", color: "text-severity-high" };
      case "drought":
        return { icon: Droplet, title: "Droughts", color: "text-severity-moderate" };
      case "landslide":
        return { icon: Mountain, title: "Landslides", color: "text-amber-500" };
      default:
        return { icon: Compass, title: "Volcanic Activity", color: "text-orange-500" };
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn">
      
      {/* breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Awareness Hub</span>
      </div>

      {/* Telemetry connection status */}
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

      {/* Hero section */}
      <div className="mb-8 p-6 rounded-xl border border-border-custom bg-bg-secondary flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-l-accent-primary">
        <div className="space-y-2">
          <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">
            EOC Disaster Awareness Hub
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[720px]">
            Access verified safety guidelines, warning indicator criteria, and structured evacuation checklists compiled by Emergency Operations Center command. Navigate below to review specific hazard categories.
          </p>
        </div>
      </div>

      {/* Hazard Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 h-[220px] animate-pulse bg-bg-secondary border-border-custom flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-8 w-8 bg-text-muted/10 rounded-full"></div>
                <div className="h-4 w-32 bg-text-muted/10 rounded"></div>
                <div className="h-3 w-60 bg-text-muted/10 rounded"></div>
              </div>
              <div className="h-8 w-24 bg-text-muted/10 rounded"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hazards.map((h, idx) => {
            const meta = getHazardMeta(h.hazard);
            const IconComponent = meta.icon;

            return (
              <Card key={h.hazard || idx} className="p-6 bg-bg-secondary border border-border-custom hover:border-accent-primary/40 transition duration-200 flex flex-col justify-between min-h-[240px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-lg bg-bg-primary border border-border-custom">
                      <IconComponent className={`h-6 w-6 ${meta.color}`} />
                    </div>
                    <span className="text-[8px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      FEMA Guide
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-text-primary">
                      {meta.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                      {h.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-custom/50 flex items-center justify-between">
                  <div className="flex gap-1.5 items-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-[10px] font-bold text-text-muted uppercase">
                      {h.warningSigns.length} Indicators
                    </span>
                  </div>
                  
                  <Link href={`/awareness/${h.hazard}`} className="inline-block">
                    <Button variant="secondary" className="text-[9px] font-bold uppercase tracking-wider h-8 px-3 flex items-center gap-1">
                      Checklists <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
