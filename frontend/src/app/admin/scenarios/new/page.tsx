"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Save,
  CheckCircle,
  FileText,
  Clock,
  Compass,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface FormState {
  name: string;
  description: string;
  disasterType: string;
  disasterSubtype: string;
  country: string;
  iso: string;
  region: string;
  magnitude: string;
  magnitudeScale: string;
  durationHours: string;
  cascadingIntervalHours: string;
  notes: string;
  tagsString: string;
  status: "Draft" | "Published";
}

const DISASTER_SUBTYPES: Record<string, string[]> = {
  Flood: ["River flood", "Flash flood", "Coastal flood"],
  Earthquake: ["Tectonic", "Volcanic seismic"],
  Storm: ["Tropical cyclone", "Convective storm", "Extra-tropical storm"],
  Wildfire: ["Forest fire", "Land fire"],
  Drought: ["Agricultural", "Hydrological"],
  Landslide: ["Avalanche", "Mudslide"],
  "Volcanic Activity": ["Ash fall", "Lava flow"],
};

export default function CreateScenarioWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    disasterType: "Storm",
    disasterSubtype: "Tropical cyclone",
    country: "India",
    iso: "IND",
    region: "",
    magnitude: "",
    magnitudeScale: "Kph",
    durationHours: "48",
    cascadingIntervalHours: "12",
    notes: "",
    tagsString: "",
    status: "Draft",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Scenario template name is required";
    if (!form.disasterType) errs.disasterType = "Disaster hazard class is required";
    if (!form.country.trim()) errs.country = "Target country name is required";
    if (form.iso.trim().length !== 3) errs.iso = "ISO code must be precisely 3 letters (e.g. IND)";
    
    const magNum = parseFloat(form.magnitude);
    if (!form.magnitude.trim()) {
      errs.magnitude = "Magnitude parameter is required";
    } else if (isNaN(magNum) || magNum <= 0) {
      errs.magnitude = "Magnitude must be a positive numeric value";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "disasterType") {
        updated.disasterSubtype = DISASTER_SUBTYPES[value]?.[0] || "";
        if (value === "Earthquake") updated.magnitudeScale = "Richter";
        else if (value === "Storm") updated.magnitudeScale = "Kph";
        else if (value === "Flood") updated.magnitudeScale = "Km2";
        else updated.magnitudeScale = "Index";
      }
      return updated;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-secondary select-none">
        <Link href="/admin/scenarios" className="hover:text-accent-primary transition font-semibold">
          Scenario Library
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary font-bold">New Scenario Wizard</span>
      </div>

      {/* Title */}
      <div className="border-b border-border-custom pb-4 select-none">
        <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-primary" /> Create Scenario Template
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Establish simulation models mapping resource requirements, warning intervals, and casualty statistics.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 gap-4 select-none">
        <div
          onClick={() => setStep(1)}
          className={`p-4 border rounded-2xl cursor-pointer transition flex items-center gap-3 ${
            step === 1
              ? "bg-accent-primary/5 border-accent-primary/40 text-accent-primary"
              : "bg-bg-secondary border-border-custom text-text-muted hover:border-text-muted/20"
          }`}
        >
          <span className="h-6 w-6 rounded-full bg-accent-primary/10 text-xs font-black flex items-center justify-center">
            1
          </span>
          <div className="text-left">
            <h4 className="text-xs font-black uppercase tracking-wider">Step 1: Core Bounds</h4>
            <p className="text-[10px] text-text-secondary font-mono mt-0.5">Hazard & Region Settings</p>
          </div>
        </div>

        <div
          className={`p-4 border rounded-2xl transition flex items-center gap-3 ${
            step === 2
              ? "bg-accent-primary/5 border-accent-primary/40 text-accent-primary"
              : "bg-bg-secondary border-border-custom text-text-muted"
          }`}
        >
          <span className="h-6 w-6 rounded-full bg-bg-primary text-xs font-black flex items-center justify-center">
            2
          </span>
          <div className="text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">Step 2: Timelines & Tags</h4>
            <p className="text-[10px] text-text-secondary font-mono mt-0.5">Cascades & Metadata</p>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Body */}
      {step === 1 ? (
        <Card className="p-6 space-y-6 border-border-custom bg-bg-secondary">
          <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
            <Compass className="h-4.5 w-4.5 text-accent-teal" />
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Core Hazard Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scenario Name */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Scenario Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Category 5 Cyclone Odisha Impact Grid"
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
              />
              {errors.name && <p className="text-[10px] font-bold text-severity-extreme">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Detail the hypothetical trigger parameters and meteorological scope..."
                rows={3}
                className="w-full p-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
              />
            </div>

            {/* Disaster Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Disaster Type *
              </label>
              <select
                name="disasterType"
                value={form.disasterType}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-secondary focus:outline-hidden"
              >
                {Object.keys(DISASTER_SUBTYPES).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Disaster Subtype */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Disaster Subtype
              </label>
              <select
                name="disasterSubtype"
                value={form.disasterSubtype}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-secondary focus:outline-hidden"
              >
                {(DISASTER_SUBTYPES[form.disasterType] || []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. India"
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
              />
              {errors.country && <p className="text-[10px] font-bold text-severity-extreme">{errors.country}</p>}
            </div>

            {/* ISO */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                ISO Code (3-letter uppercase) *
              </label>
              <input
                type="text"
                name="iso"
                value={form.iso}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().slice(0, 3);
                  handleChange(e);
                }}
                placeholder="e.g. IND"
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary uppercase tracking-widest focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
              />
              {errors.iso && <p className="text-[10px] font-bold text-severity-extreme">{errors.iso}</p>}
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                Region / State
              </label>
              <input
                type="text"
                name="region"
                value={form.region}
                onChange={handleChange}
                placeholder="e.g. Odisha Coast"
                className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden"
              />
            </div>

            {/* Magnitude and Scale */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Magnitude *
                </label>
                <input
                  type="text"
                  name="magnitude"
                  value={form.magnitude}
                  onChange={handleChange}
                  placeholder="e.g. 220"
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Scale
                </label>
                <select
                  name="magnitudeScale"
                  value={form.magnitudeScale}
                  onChange={handleChange}
                  className="w-full h-10 px-2 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-secondary focus:outline-hidden"
                >
                  <option value="Kph">Kph</option>
                  <option value="Richter">Richter</option>
                  <option value="Km2">Km2</option>
                  <option value="Index">Index</option>
                </select>
              </div>
              {errors.magnitude && (
                <div className="col-span-3">
                  <p className="text-[10px] font-bold text-severity-extreme">{errors.magnitude}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-between border-t border-border-custom/50 pt-4 select-none">
            <Link href="/admin/scenarios">
              <Button variant="outline" className="h-9 text-[10px] font-bold uppercase tracking-wider">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleNext}
              variant="primary"
              className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              Next: Extended Parameters <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-border-custom bg-bg-secondary text-center space-y-4">
          <Clock className="h-10 w-10 text-text-muted mx-auto animate-pulse" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Step 2 Parameters Placeholder
          </h3>
          <p className="text-xs text-text-secondary">
            Timeline intervals, tags mapping, and operational template persistence options are configured in Step 2.
          </p>
          <div className="flex justify-between border-t border-border-custom/50 pt-4 mt-6 select-none">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Step 1
            </Button>
            <Button disabled variant="primary" className="h-9 text-[10px] font-bold uppercase tracking-wider">
              Create Scenario Template
            </Button>
          </div>
        </Card>
      )}

      {/* Advisory notes */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex gap-3 select-none">
        <ShieldAlert className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-text-primary">VALIDATION RULES:</span>{" "}
          <span className="text-text-secondary">
            Ensure scenario magnitudes map directly to typical telemetry indexes (e.g. wind speeds in Kph, areas in Km2). Subtypes automatically populate base resource allocation scales.
          </span>
        </div>
      </div>
    </div>
  );
}
