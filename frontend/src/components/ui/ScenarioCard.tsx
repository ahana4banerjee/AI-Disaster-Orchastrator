"use client";

import React from "react";
import Link from "next/link";
import { Copy, Trash2, SlidersHorizontal, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface TimelineParameters {
  durationHours: number;
  cascadingIntervalHours: number;
}

interface Scenario {
  _id: string;
  name: string;
  description: string;
  disasterType: string;
  disasterSubtype: string;
  country: string;
  iso: string;
  region: string;
  magnitude: number;
  magnitudeScale: string;
  timelineParameters: TimelineParameters;
  notes: string;
  tags: string[];
  status: "Draft" | "Published";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  isSelectDisabled: boolean;
  isProcessing: boolean;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isSelected,
  isSelectDisabled,
  isProcessing,
  onSelect,
  onDuplicate,
  onDelete,
}) => {
  return (
    <Card
      className={`bg-bg-secondary border transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[220px] ${
        isSelected
          ? "border-accent-primary ring-1 ring-accent-primary/20"
          : "border-border-custom hover:border-text-muted/40"
      }`}
    >
      {/* Header Title area */}
      <div className="p-5 border-b border-border-custom bg-bg-primary/20 flex justify-between items-start gap-4 select-none">
        <div className="space-y-1">
          <span
            className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              scenario.status === "Published"
                ? "bg-accent-teal/10 text-accent-teal border-accent-teal/20"
                : "bg-text-muted/10 text-text-muted border-border-custom"
            }`}
          >
            {scenario.status}
          </span>
          <h3 className="text-xs font-bold text-text-primary tracking-wide uppercase line-clamp-1">
            {scenario.name}
          </h3>
          <p className="text-[10px] text-text-muted font-semibold">
            {scenario.disasterType} &bull; {scenario.country || "Global"}
          </p>
        </div>

        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(scenario._id)}
          disabled={isSelectDisabled}
          className="h-4.5 w-4.5 rounded border-border-custom text-accent-primary focus:ring-accent-primary cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
          {scenario.description || "No description provided for this hypothetical template."}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border-custom/50 pt-3 select-none">
          <div>
            <span className="text-text-muted uppercase font-semibold">Magnitude:</span>
            <span className="block font-bold font-mono text-text-primary">
              {scenario.magnitude} {scenario.magnitudeScale}
            </span>
          </div>
          <div>
            <span className="text-text-muted uppercase font-semibold">Timeline Limit:</span>
            <span className="block font-bold font-mono text-text-primary">
              {scenario.timelineParameters?.durationHours} hrs
            </span>
          </div>
        </div>
      </div>

      {/* Card footer actions */}
      <div className="px-5 py-3 border-t border-border-custom bg-bg-primary/10 flex items-center justify-between">
        <div className="flex gap-2 select-none">
          {scenario.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-semibold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded border border-border-custom"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 text-text-muted animate-spin" />
          ) : (
            <>
              <button
                onClick={() => onDuplicate(scenario._id)}
                title="Duplicate Scenario"
                className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <Link href={`/admin/scenarios/${scenario._id}/edit`}>
                <button
                  title="Edit Scenario"
                  className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-accent-primary transition cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </Link>
              <button
                onClick={() => onDelete(scenario._id)}
                title="Delete Scenario"
                className="p-1.5 rounded hover:bg-bg-primary text-severity-extreme/75 hover:text-severity-extreme transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
