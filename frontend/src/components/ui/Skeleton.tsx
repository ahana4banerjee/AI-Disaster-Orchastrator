import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-text-muted/10 rounded-lg ${className}`}
      style={{ animationDuration: "1.5s", ...style }}
    />
  );
}

export function KPISkeleton() {
  return (
    <div className="bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[140px]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4.5 w-4.5" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-2">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between h-[60px] border-b border-border-custom px-4 bg-bg-secondary">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between h-[56px] border-b border-border-custom px-4 bg-bg-secondary">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 w-16" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-72 border border-border-custom border-dashed rounded-lg p-5 flex flex-col justify-between bg-bg-secondary">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex-1 flex items-end gap-3 mt-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}
