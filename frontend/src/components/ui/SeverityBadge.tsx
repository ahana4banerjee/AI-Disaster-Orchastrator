import React from "react";

type SeverityType = "low" | "moderate" | "high" | "extreme" | "critical" | string;

interface SeverityBadgeProps {
  severity: SeverityType;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  if (!severity) return null;
  const normalized = severity.toLowerCase().trim();

  const styles = {
    low: "bg-severity-low/10 text-severity-low border-severity-low/20",
    moderate: "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20",
    high: "bg-severity-high/10 text-severity-high border-severity-high/20",
    extreme: "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20",
    critical: "bg-severity-critical/10 text-severity-critical border-severity-critical/20",
  };

  const label = normalized.toUpperCase();
  const styleClass = styles[normalized as keyof typeof styles] || "bg-text-muted/10 text-text-muted border-text-muted/20";

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase select-none ${styleClass} ${className}`}
    >
      {label}
    </span>
  );
}
