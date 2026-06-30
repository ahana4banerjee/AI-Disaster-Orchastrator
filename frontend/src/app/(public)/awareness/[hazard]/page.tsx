"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  AlertTriangle,
  ClipboardList,
  Flame,
  CheckSquare,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface HazardGuide {
  hazard: string;
  description: string;
  warningSigns: string[];
  before: string[];
  during: string[];
  after: string[];
  resources: string[];
}

export default function HazardAwarenessDetails({ params }: { params: Promise<{ hazard: string }> }) {
  const resolvedParams = use(params);
  const pathHazard = resolvedParams.hazard;

  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<HazardGuide | null>(null);
  const [activeTab, setActiveTab] = useState<"before" | "during" | "after">("before");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // High-fidelity fallback list if API database collection is empty/offline
  const fallbackGuides: Record<string, HazardGuide> = {
    flood: {
      hazard: "flood",
      description: "Rapid accumulation of water in normally dry landmass areas, triggered by intense rainfall, storms, or dam failures.",
      warningSigns: [
        "Rapidly rising water levels in local waterways",
        "Heavy rainfall persisting over multiple hours",
        "Saturated ground conditions with localized pooling"
      ],
      before: [
        "Build an emergency kit containing non-perishable foods and water supplies",
        "Identify elevated evacuation routes and local emergency shelters",
        "Secure household appliances and document physical assets"
      ],
      during: [
        "Evacuate immediately if directed by regional emergency services",
        "Avoid walking or driving through moving water currents",
        "Move to higher levels or attic crawlspaces if trapped inside structures"
      ],
      after: [
        "Boil all drinking water until local sanitation declares lines safe",
        "Avoid electrical devices contact if exposed to standing water",
        "Document structural damages for restoration claims"
      ],
      resources: [
        "FEMA Flood Safety Guide",
        "Red Cross Emergency Kit Preparation Guide"
      ]
    },
    earthquake: {
      hazard: "earthquake",
      description: "Sudden release of geological energy along fault lines, producing strong ground shaking and structural shifts.",
      warningSigns: [
        "Minor structural rattling or deep rumbling sounds",
        "Erratic animal behaviors or sudden pet alarms",
        "Initial minor tremors preceding large seismic shifts"
      ],
      before: [
        "Anchor heavy furniture, mirrors, and shelving to wall studs",
        "Establish a family reunion protocol and designate assembly points",
        "Locate utility shutoff valves (gas, electricity, water)"
      ],
      during: [
        "Execute drop, cover, and hold under sturdy furniture",
        "Stay indoors away from exterior windows, glass, or heavy cabinets",
        "Pull over safely to the side of the road if operating vehicles"
      ],
      after: [
        "Check structural walls for cracks and sniff for gas leaks",
        "Expect subsequent aftershocks and keep shoes on to avoid debris",
        "Monitor local EOC broadcasts for structural safety updates"
      ],
      resources: [
        "USGS Earthquake Hazards Portal",
        "Red Cross Earthquake Readiness Checklist"
      ]
    },
    storm: {
      hazard: "storm",
      description: "Violent atmospheric disturbances characterized by high-velocity winds, lightning, hail, and heavy rainfall.",
      warningSigns: [
        "Sudden drop in barometric pressure and dark wall clouds",
        "Violent wind gust increases and atmospheric cooling",
        "Severe thunder and continuous lighting strikes"
      ],
      before: [
        "Trim weak tree branches hanging over structural roofs",
        "Board up glass windows and secure all loose outdoor items",
        "Charge battery backup devices and keep flashlights nearby"
      ],
      during: [
        "Seek shelter inside a central interior room away from windows",
        "Unplug sensitive electrical devices to prevent surge damage",
        "Avoid showering or using landline phones during lightning storms"
      ],
      after: [
        "Report downed utility lines to local power grids",
        "Inspect property roofs for damage and avoid flooded streets",
        "Check on elderly neighbors and clear small yard blockages"
      ],
      resources: [
        "National Weather Service Storm Preparedness",
        "EOC Windstorm Safety Toolkit"
      ]
    },
    wildfire: {
      hazard: "wildfire",
      description: "Uncontrolled fires spreading rapidly across dry forest, brush, or woodland areas, threatening lives and properties.",
      warningSigns: [
        "Plumes of dark smoke rising along the horizon",
        "Smell of burning timber and falling ash",
        "Sudden increases in local wind speeds and temperatures"
      ],
      before: [
        "Clear dry leaves, twigs, and vegetation within 30 feet of structures",
        "Designate a safe evacuation destination outside fire zones",
        "Keep vehicle fuel tanks full and pack emergency bags"
      ],
      during: [
        "Evacuate immediately upon receiving alert orders",
        "Keep all windows, doors, and vents closed if remaining indoors",
        "Wear face coverings or wet cloths to filter ash and smoke inhalation"
      ],
      after: [
        "Inspect roof, attic, and crawlspaces for hidden hot spots",
        "Avoid hot ash, charred trees, and active utility lines",
        "Wait for EOC all-clear notices before returning to properties"
      ],
      resources: [
        "Ready.gov Wildfire Safety Guide",
        "State Forestry Fire Prevention Bureau"
      ]
    },
    drought: {
      hazard: "drought",
      description: "Extended periods of deficient rainfall resulting in water scarcity, crop damage, and ecological imbalances.",
      warningSigns: [
        "Decreasing water levels in reservoirs and wells",
        "Widespread wilting of crops and dry soil cracks",
        "Local water utility restrictions on non-essential consumption"
      ],
      before: [
        "Install water-efficient fixtures and low-flow aerators",
        "Repair structural plumbing leaks and insulate water pipes",
        "Establish rainwater harvesting systems for landscape irrigation"
      ],
      during: [
        "Adhere strictly to local utility water rationing mandates",
        "Re-use greywater for plants and household flushing",
        "Prioritize water supplies for hydration and hygiene needs"
      ],
      after: [
        "Evaluate long-term agricultural soil restoration strategies",
        "Maintain water conservation habits post-drought recovery",
        "Participate in local water resource planning forums"
      ],
      resources: [
        "National Drought Mitigation Center",
        "EPA Water Conservation Guidelines"
      ]
    },
    landslide: {
      hazard: "landslide",
      description: "Downward movement of soil, rocks, and debris along slopes, triggered by heavy rain, seismic activity, or human construction.",
      warningSigns: [
        "New cracks in plaster, tile, brick, or foundations",
        "Tilted trees, utility poles, or retaining walls",
        "Faint rumbling sounds that increase in volume over time"
      ],
      before: [
        "Avoid building structures on steep slopes or near ravine edges",
        "Plant ground cover on slopes to stabilize soil structures",
        "Review evacuation paths away from potential debris flows"
      ],
      during: [
        "Evacuate immediately if you suspect a debris flow is imminent",
        "Curl into a tight ball and protect your head if escape is impossible",
        "Listen for unusual cracking sounds indicating moving earth"
      ],
      after: [
        "Stay away from the slide area to prevent secondary slide traps",
        "Check for damaged utility lines and report them to authorities",
        "Consult geotechnical specialists to evaluate slope stability"
      ],
      resources: [
        "USGS Landslides Hazards Program",
        "Red Cross Landslide Preparedness Guide"
      ]
    },
    volcano: {
      hazard: "volcano",
      description: "Release of molten rock, ash, and gases from underground chambers, producing lava flows, ash fall, and toxic gas clouds.",
      warningSigns: [
        "Increased seismic shaking or minor tremors near vents",
        "Ground deformation or bulging of the volcano slope",
        "Changes in gas emissions or visible steam plumes"
      ],
      before: [
        "Establish evacuation routes outside defined exclusion zones",
        "Keep goggles and N95 masks in emergency supply kits",
        "Review safety plans for ash fall protection and shelter-in-place"
      ],
      during: [
        "Follow evacuation orders from local authorities immediately",
        "Wear long sleeves, pants, and eye protection if caught in ash fall",
        "Stay indoors with all windows and ventilation systems closed"
      ],
      after: [
        "Clear heavy ash accumulation from roofs to prevent collapse",
        "Avoid driving through thick ash clouds to protect engine filters",
        "Listen to emergency EOC broadcasts for air quality warnings"
      ],
      resources: [
        "USGS Volcano Hazards Program",
        "FEMA Volcanic Ash Safety Portal"
      ]
    }
  };

  const fetchGuide = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/public/awareness/${pathHazard}`);
      if (res.ok) {
        const data = await res.json();
        setGuide(data);
        setStatusMessage({ text: `SAFETY REGISTRY STREAM ACTIVE: ${pathHazard.toUpperCase()} MATRIX ONLINE.`, type: "success" });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      const mock = fallbackGuides[pathHazard.toLowerCase().trim()] || fallbackGuides.flood;
      setGuide(mock);
      setStatusMessage({ text: "LOCAL SEED-FAILOVER ACTIVE. RENDERING OFFLINE CHECKLISTS.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, [pathHazard]);

  // Retrieve checklist arrays based on active selected tab
  const getActiveChecklist = () => {
    if (!guide) return [];
    if (activeTab === "before") return guide.before;
    if (activeTab === "during") return guide.during;
    return guide.after;
  };

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn">
      
      {/* breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/awareness" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" /> Awareness Hub
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">
          {guide?.hazard || pathHazard} Safety Guide
        </span>
      </div>

      {/* Connection beacon banner */}
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

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 h-[200px] animate-pulse bg-bg-secondary">
              <div className="h-full w-full bg-text-muted/5 rounded" />
            </Card>
            <Card className="p-6 h-[180px] animate-pulse bg-bg-secondary">
              <div className="h-full w-full bg-text-muted/5 rounded" />
            </Card>
          </div>
          <div className="lg:col-span-8">
            <Card className="p-6 h-[400px] animate-pulse bg-bg-secondary">
              <div className="h-full w-full bg-text-muted/5 rounded" />
            </Card>
          </div>
        </div>
      ) : guide ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: description and warning indicators */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 space-y-4 border-l-4 border-l-accent-primary">
              <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded uppercase tracking-wider">
                Hazard Profile
              </span>
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">
                {guide.hazard} Safety Overview
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {guide.description}
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2 border-b border-border-custom pb-3">
                <AlertTriangle className="h-4.5 w-4.5 text-severity-high" />
                Warning Signs & Indicators
              </h3>
              
              <ul className="space-y-3 pt-1">
                {guide.warningSigns.map((sign, idx) => (
                  <li key={idx} className="text-xs font-medium text-text-secondary flex gap-3 items-start leading-relaxed">
                    <span className="h-2 w-2 rounded-full bg-severity-high mt-1.5 shrink-0"></span>
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Right panel: Tabbed before/during/after checklists */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs selectors */}
            <div className="flex gap-2 border-b border-border-custom pb-px">
              {[
                { id: "before", label: "Before Hazard", icon: ClipboardList },
                { id: "during", label: "During Hazard", icon: Flame },
                { id: "after", label: "After Recovery", icon: ShieldCheck },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer -mb-px ${
                      isSelected
                        ? "border-accent-primary text-accent-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Checklist items panel */}
            <Card className="p-6 space-y-6 bg-bg-secondary border border-border-custom">
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-accent-primary" />
                  EOC Standard Checklist
                </h4>
                <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wide">
                  Items: {getActiveChecklist().length}
                </span>
              </div>

              <div className="space-y-4">
                {getActiveChecklist().map((item, idx) => (
                  <label key={idx} className="flex gap-4 items-start p-3 rounded-lg border border-border-custom/50 bg-bg-primary/30 hover:bg-bg-primary/60 transition cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border-custom text-accent-primary focus:ring-accent-primary mt-0.5 cursor-pointer accent-accent-primary shrink-0"
                    />
                    <span className="text-xs font-medium text-text-secondary leading-relaxed">
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </Card>

            {/* External verified references */}
            {guide.resources.length > 0 && (
              <Card className="p-5 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Verified Safety References
                </h4>
                <div className="flex flex-wrap gap-3">
                  {guide.resources.map((res, idx) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md bg-bg-secondary border border-border-custom text-[10px] font-bold text-text-secondary font-mono">
                      {res}
                    </span>
                  ))}
                </div>
              </Card>
            )}

          </div>

        </div>
      ) : (
        <Card className="p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-text-muted mx-auto mb-4" />
          <h4 className="text-sm font-bold uppercase text-text-primary">Safety guide load failure</h4>
          <p className="text-xs text-text-muted pt-1">Verify dynamic route path parameter spelling.</p>
        </Card>
      )}

    </div>
  );
}
