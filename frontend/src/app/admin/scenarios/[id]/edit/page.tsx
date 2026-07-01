"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ChevronRight,
  ShieldAlert,
  Save,
  Loader2,
  Clock,
  Compass,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
  revisionComments: string;
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

export default function EditScenarioWizard({ params }: PageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    revisionComments: "Minor operational adjustment.",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchScenario = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`http://localhost:8000/api/v1/scenarios/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setForm({
            name: data.name || "",
            description: data.description || "",
            disasterType: data.disasterType || "Storm",
            disasterSubtype: data.disasterSubtype || "",
            country: data.country || "",
            iso: data.iso || "",
            region: data.region || "",
            magnitude: data.magnitude ? data.magnitude.toString() : "",
            magnitudeScale: data.magnitudeScale || "Kph",
            durationHours: data.timelineParameters?.durationHours ? data.timelineParameters.durationHours.toString() : "48",
            cascadingIntervalHours: data.timelineParameters?.cascadingIntervalHours ? data.timelineParameters.cascadingIntervalHours.toString() : "12",
            notes: data.notes || "",
            tagsString: data.tags ? data.tags.join(", ") : "",
            status: data.status || "Draft",
            revisionComments: "Updated template parameters.",
          });
        }
      } catch {
        // Fallback fallback if offline
        setForm((prev) => ({
          ...prev,
          name: "Cyclone Odisha Baseline (Category 4 Equivalent)",
          description: "Base template for hurricane preparedness simulations on the east coast.",
          disasterType: "Storm",
          disasterSubtype: "Tropical cyclone",
          country: "India",
          iso: "IND",
          region: "Odisha",
          magnitude: "220",
          magnitudeScale: "Kph",
          durationHours: "48",
          cascadingIntervalHours: "12",
          notes: "Requires high coastal shelter allocation.",
          tagsString: "cyclone, east-coast",
          status: "Published",
          revisionComments: "Minor tweaks.",
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [id]);

  const validateForm = () => {
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

    const durNum = parseInt(form.durationHours);
    if (!form.durationHours.trim()) {
      errs.durationHours = "Timeline duration limit is required";
    } else if (isNaN(durNum) || durNum <= 0) {
      errs.durationHours = "Duration must be a positive integer hours limit";
    }

    const intervalNum = parseInt(form.cascadingIntervalHours);
    if (!form.cascadingIntervalHours.trim()) {
      errs.cascadingIntervalHours = "Cascading interval hours step is required";
    } else if (isNaN(intervalNum) || intervalNum <= 0) {
      errs.cascadingIntervalHours = "Interval must be a positive integer hours step";
    }

    if (!form.revisionComments.trim()) errs.revisionComments = "Revision log comment is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setErrors({});

    try {
      const tags = form.tagsString
        ? form.tagsString.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
        : [];
      
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        disasterType: form.disasterType,
        disasterSubtype: form.disasterSubtype,
        country: form.country.trim(),
        iso: form.iso.trim().toUpperCase(),
        region: form.region.trim(),
        magnitude: parseFloat(form.magnitude),
        magnitudeScale: form.magnitudeScale,
        timelineParameters: {
          durationHours: parseInt(form.durationHours),
          cascadingIntervalHours: parseInt(form.cascadingIntervalHours),
        },
        notes: form.notes.trim(),
        tags: tags,
        status: form.status,
      };

      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://localhost:8000/api/v1/scenarios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.replace("/admin/scenarios");
      } else {
        const errorData = await res.json();
        setErrors({ submit: errorData.detail || "API update submission failed" });
      }
    } catch {
      setErrors({ submit: "Unable to connect to the backend server. Please verify uvicorn is active." });
    } finally {
      setIsSaving(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
        <span className="text-xs text-text-secondary font-mono">Hydrating template details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Link href="/admin/scenarios" className="hover:text-accent-primary transition font-semibold">
            Scenario Library
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-text-primary font-bold">Edit Scenario</span>
        </div>
        <Link href="/admin/scenarios">
          <Button variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
          </Button>
        </Link>
      </div>

      {/* Title */}
      <div className="border-b border-border-custom pb-4 select-none">
        <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-primary" /> Edit Scenario Template
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Modifying existing hazard templates will update the active EOC simulation guidelines for new executions.
        </p>
      </div>

      {/* Unified Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Parameters Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Card */}
          <Card className="p-6 space-y-6 border-border-custom bg-bg-secondary">
            <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
              <Compass className="h-4.5 w-4.5 text-accent-teal" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                1. Core Bounds & Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template Name */}
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
                  placeholder="Detail the hypothetical trigger scope..."
                  rows={2}
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
                  ISO Code *
                </label>
                <input
                  type="text"
                  name="iso"
                  value={form.iso}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase().slice(0, 3);
                    handleChange(e);
                  }}
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
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden"
                />
              </div>

              {/* Magnitude & Scale */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                    Magnitude *
                  </label>
                  <input
                    type="text"
                    name="magnitude"
                    value={form.magnitude}
                    onChange={handleChange}
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
          </Card>

          {/* Extended Card */}
          <Card className="p-6 space-y-6 border-border-custom bg-bg-secondary">
            <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
              <Clock className="h-4.5 w-4.5 text-accent-teal" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                2. Timelines & Directives
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Scenario Duration (Hours) *
                </label>
                <input
                  type="text"
                  name="durationHours"
                  value={form.durationHours}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
                />
                {errors.durationHours && (
                  <p className="text-[10px] font-bold text-severity-extreme">{errors.durationHours}</p>
                )}
              </div>

              {/* Interval */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Cascading Interval (Hours) *
                </label>
                <input
                  type="text"
                  name="cascadingIntervalHours"
                  value={form.cascadingIntervalHours}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
                />
                {errors.cascadingIntervalHours && (
                  <p className="text-[10px] font-bold text-severity-extreme">{errors.cascadingIntervalHours}</p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Operational Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full p-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Version log panel */}
        <div className="space-y-6">
          <Card className="p-6 space-y-6 border-border-custom bg-bg-secondary">
            <div className="flex items-center gap-2 pb-2 border-b border-border-custom/50 select-none">
              <Layers className="h-4.5 w-4.5 text-accent-teal" />
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                3. Versioning Control
              </h3>
            </div>

            <div className="space-y-4">
              {/* Status select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Template Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-secondary focus:outline-hidden"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  name="tagsString"
                  value={form.tagsString}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden"
                />
              </div>

              {/* Revision comments */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  Revision Notes (Audit Log) *
                </label>
                <textarea
                  name="revisionComments"
                  value={form.revisionComments}
                  onChange={handleChange}
                  placeholder="e.g. Updated hurricane winds bounds values."
                  rows={3}
                  className="w-full p-3 bg-bg-primary border border-border-custom rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/20"
                />
                {errors.revisionComments && (
                  <p className="text-[10px] font-bold text-severity-extreme">{errors.revisionComments}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-severity-extreme/10 border border-severity-extreme/20 rounded-xl flex gap-2">
                <ShieldAlert className="h-4 w-4 text-severity-extreme shrink-0 mt-0.5" />
                <p className="text-[10px] font-semibold text-severity-extreme leading-tight">{errors.submit}</p>
              </div>
            )}

            {/* Save Buttons */}
            <div className="pt-2 select-none">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="primary"
                className="w-full h-10 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* EOC Comparative advisory */}
          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs flex gap-3 select-none">
            <ShieldAlert className="h-5 w-5 text-accent-secondary shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-text-primary">AUDIT COMPLIANCE:</span>{" "}
              <span className="text-text-secondary">
                Revision logs are permanently archived in the system audit registry. All changes affect active simulation layouts.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
