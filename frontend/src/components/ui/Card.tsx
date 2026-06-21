import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs transition duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface IntelligenceCardProps extends CardProps {
  severity: "low" | "moderate" | "high" | "extreme" | "critical";
  title: string;
  timestamp?: string;
  badge?: React.ReactNode;
}

export function IntelligenceCard({
  severity,
  title,
  timestamp,
  badge,
  children,
  className = "",
  ...props
}: IntelligenceCardProps) {
  const severityColors = {
    low: "border-l-severity-low",
    moderate: "border-l-severity-moderate",
    high: "border-l-severity-high",
    extreme: "border-l-severity-extreme",
    critical: "border-l-severity-critical",
  };

  return (
    <div
      className={`bg-bg-secondary border border-border-custom border-l-4 ${severityColors[severity]} rounded-r-2xl rounded-l-md p-5 shadow-xs transition duration-150 ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-bold text-text-primary tracking-wide">{title}</h4>
        <div className="flex items-center gap-2">
          {badge}
          {timestamp && <span className="text-[10px] text-text-muted font-mono">{timestamp}</span>}
        </div>
      </div>
      <div className="text-xs text-text-secondary leading-relaxed">{children}</div>
    </div>
  );
}
