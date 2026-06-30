"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Printer,
  RefreshCw,
  Search,
  Database,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  FolderLock,
  Luggage,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ChecklistItem {
  item: string;
  category: string;
  priority: string;
}

export default function PreparednessAssistant() {
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("Kenya");
  const [disasterType, setDisasterType] = useState("Flood");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Load configuration and checking state from localStorage on mount
  useEffect(() => {
    const savedCountry = localStorage.getItem("preparedness_country");
    const savedDisaster = localStorage.getItem("preparedness_disaster");
    const savedChecklist = localStorage.getItem("preparedness_checklist");
    const savedChecked = localStorage.getItem("preparedness_checked_items");

    if (savedCountry) setCountry(savedCountry);
    if (savedDisaster) setDisasterType(savedDisaster);
    if (savedChecklist) {
      setChecklist(JSON.parse(savedChecklist));
    }
    if (savedChecked) {
      setCheckedItems(JSON.parse(savedChecked));
    }
  }, []);

  // Save checklist and checked state to localStorage on updates
  const saveState = (updatedList: ChecklistItem[], updatedChecked: Record<string, boolean>) => {
    localStorage.setItem("preparedness_country", country);
    localStorage.setItem("preparedness_disaster", disasterType);
    localStorage.setItem("preparedness_checklist", JSON.stringify(updatedList));
    localStorage.setItem("preparedness_checked_items", JSON.stringify(updatedChecked));
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!country.trim() || !disasterType.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const url = `http://localhost:8000/api/v1/public/preparedness/checklist?country=${encodeURIComponent(country)}&disasterType=${encodeURIComponent(disasterType)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setChecklist(data);
        const newChecked: Record<string, boolean> = {};
        setCheckedItems(newChecked);
        saveState(data, newChecked);
        setStatusMessage({ text: "PREPAREDNESS CHECKLIST COMPILED DYNAMICALLY.", type: "success" });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      // Local fallback template checklist generation
      const simulated: ChecklistItem[] = [
        { item: "Pack a 3-day supply of water (1 gallon per person per day for drinking and sanitation)", category: "Supplies", priority: "Critical" },
        { item: "Pack a 3-day supply of non-perishable, ready-to-eat food items", category: "Supplies", priority: "Critical" },
        { item: "Pack a complete first aid kit and any necessary prescription family medications", category: "Supplies", priority: "Critical" },
        { item: "Pack emergency flashlights, a hand-crank radio, and extra batteries", category: "Supplies", priority: "Critical" },
        { item: "Pack backup battery power banks and device charging cables", category: "Supplies", priority: "Critical" },
        { item: "Secure copies of crucial documents (ID cards, insurance deeds, medical logs) in water-resistant sleeves", category: "Documents", priority: "Critical" },
        { item: `Establish immediate evacuation routes for ${disasterType} events`, category: "Action Item", priority: "Recommended" },
        { item: `Clear surrounding vegetation or secure windows based on ${disasterType} safety standards`, category: "Action Item", priority: "Recommended" },
        { item: `Stay tuned to regional EOC alert broadcasts during ${disasterType} events`, category: "Survival Action", priority: "Critical" },
        { item: `Regional Precaution: ${country} represents a documented historical zone for ${disasterType} events.`, category: "Regional Info", priority: "Recommended" }
      ];

      setChecklist(simulated);
      const newChecked: Record<string, boolean> = {};
      setCheckedItems(newChecked);
      saveState(simulated, newChecked);
      setStatusMessage({ text: "LOCAL GENERATOR ACTIVE. RENDERING OFFLINE CACHED CHECKLIST.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemText: string) => {
    const next = { ...checkedItems, [itemText]: !checkedItems[itemText] };
    setCheckedItems(next);
    saveState(checklist, next);
  };

  const handleReset = () => {
    const next = {};
    setCheckedItems(next);
    saveState(checklist, next);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group checklist items by category
  const categories = checklist.reduce((acc, item) => {
    const cat = item.category || "General Essentials";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Compute progress stats
  const totalCount = checklist.length;
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const pctComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn print:px-0 print:py-4">
      
      {/* breadcrumb (hidden on print) */}
      <div className="flex items-center gap-2 mb-6 print:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Preparedness Assistant</span>
      </div>

      {/* Telemetry connection status (hidden on print) */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 print:hidden ${
          statusMessage.type === "success" 
            ? "bg-severity-low/10 text-severity-low border-severity-low/20"
            : "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20"
        }`}>
          <Database className="h-4 w-4 animate-pulse shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Configurator on left, checklist on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: configurator panel (hidden on print) */}
        <Card className="lg:col-span-4 p-6 space-y-6 bg-bg-secondary border border-border-custom print:hidden">
          <div className="flex items-center gap-2 border-b border-border-custom pb-3 mb-2">
            <Luggage className="h-4.5 w-4.5 text-accent-primary animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Checklist Configurator
            </h3>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <Input
              label="Country Location"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Kenya, India"
              required
              id="country-input"
            />

            <Select
              label="Select Hazard Category"
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              id="hazard-select"
            >
              <option value="Flood">Flood</option>
              <option value="Storm">Storm</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Landslide">Landslide</option>
              <option value="Volcanic Activity">Volcanic Activity</option>
              <option value="Drought">Drought</option>
              <option value="Wildfire">Wildfire</option>
            </Select>

            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider h-11"
              disabled={loading || !country.trim()}
            >
              <Search className="h-3.5 w-3.5" />
              {loading ? "Generating checklist..." : "Compile Preparedness Checklist"}
            </Button>
          </form>

          <div className="text-[10px] text-text-muted leading-relaxed font-semibold">
            SYSTEM DIRECTIVE: Packing lists and action safety checklists are customized dynamically based on EM-DAT country incident frequencies and FEMA safety templates.
          </div>
        </Card>

        {/* Right: checklist output panel (scales to A4 print sizing) */}
        <div className="lg:col-span-8 space-y-6 print:col-span-12">
          {checklist.length > 0 ? (
            <div className="space-y-6">
              
              {/* Checklist progress and header */}
              <Card className="p-6 border-l-4 border-l-accent-primary print:border-none print:shadow-none print:p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded-sm uppercase tracking-wider print:hidden">
                      Custom Safety Pack Guide
                    </span>
                    <h2 className="text-xl font-black text-text-primary uppercase tracking-tight pt-2 print:text-2xl">
                      {disasterType} Emergency Checklist
                    </h2>
                    <p className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider mt-0.5">
                      Target Area: {country}
                    </p>
                  </div>

                  {/* Actions utility (hidden on print) */}
                  <div className="flex gap-2 print:hidden self-end sm:self-center">
                    <Button
                      variant="secondary"
                      className="h-9 px-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      onClick={handleReset}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reset
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9 px-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      onClick={handlePrint}
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                  </div>
                </div>

                {/* Progress bar container (hidden on print) */}
                <div className="mt-6 space-y-2 print:hidden">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <span>Safety Readiness Progress</span>
                    <span className="font-mono text-accent-primary">{pctComplete}% Complete ({completedCount}/{totalCount})</span>
                  </div>
                  <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden border border-border-custom">
                    <div
                      className="h-full bg-accent-primary transition-all duration-300"
                      style={{ width: `${pctComplete}%` }}
                    ></div>
                  </div>
                </div>
              </Card>

              {/* Printable lists grouped by Category */}
              <div className="space-y-6 print:space-y-4">
                {Object.entries(categories).map(([category, items]) => (
                  <Card key={category} className="p-6 space-y-4 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0">
                    <div className="flex items-center gap-2 border-b border-border-custom pb-2">
                      <FileCheck className="h-4 w-4 text-accent-primary print:hidden" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary print:text-sm">
                        {category}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {items.map((item, idx) => {
                        const isChecked = !!checkedItems[item.item];
                        return (
                          <label
                            key={idx}
                            className={`flex gap-4 items-start p-3 rounded-lg border border-border-custom/40 bg-bg-primary/30 transition cursor-pointer select-none print:border-none print:bg-transparent print:p-1 ${
                              isChecked ? "bg-bg-primary/60 border-accent-primary/20" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleItem(item.item)}
                              className="h-4 w-4 rounded border-border-custom text-accent-primary focus:ring-accent-primary mt-0.5 cursor-pointer accent-accent-primary shrink-0 print:border print:border-gray-400"
                            />
                            
                            <div className="flex-1 space-y-1">
                              <span className={`text-xs font-medium leading-relaxed ${
                                isChecked ? "line-through text-text-muted" : "text-text-secondary"
                              }`}>
                                {item.item}
                              </span>
                              
                              <div className="flex gap-2 items-center text-[8px] font-bold font-mono uppercase tracking-wider print:hidden">
                                <span className={item.priority === "Critical" ? "text-severity-extreme" : "text-text-muted"}>
                                  Priority: {item.priority}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>

            </div>
          ) : (
            <Card className="p-12 text-center space-y-4 min-h-[400px] flex flex-col items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-text-muted mx-auto" />
              <div>
                <h4 className="text-sm font-bold uppercase tracking-tight text-text-primary">
                  Ready to compile packing guide
                </h4>
                <p className="text-xs text-text-muted max-w-[400px] mx-auto pt-1 leading-relaxed">
                  Input target location and select your hazard profile to generate a customized emergency preparedness packing checklist.
                </p>
              </div>
            </Card>
          )}
        </div>

      </div>

      {/* A4 Print layout stylesheets */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-none {
            border: none !important;
            border-bottom: 1px solid #ccc !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          .print\\:col-span-12 {
            grid-column: span 12 / span 12 !important;
          }
        }
      `}</style>

    </div>
  );
}
