"use client";

import React from "react";
import { Clock } from "lucide-react";

export interface TimelineItem {
  key: string | number;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  content?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

export function Timeline({ items, emptyMessage = "No logged events available" }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-text-muted font-semibold uppercase tracking-wider">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative border-l border-border-custom pl-6 ml-3 space-y-6 text-xs select-none">
      {items.map((item, idx) => (
        <div key={item.key || idx} className="relative group">
          
          {/* Timeline Dot Indicator */}
          <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 bg-bg-primary border-2 border-accent-primary rounded-full flex items-center justify-center group-hover:scale-110 transition duration-150">
            <span className="h-1.5 w-1.5 bg-accent-primary rounded-full"></span>
          </span>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wide">
                  {item.title}
                </h4>
                {item.badge}
              </div>
              <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> {item.subtitle}
              </span>
            </div>

            {item.content && (
              <div className="text-[11px] text-text-secondary leading-relaxed bg-bg-primary/30 border border-border-custom/50 rounded-lg p-3">
                {item.content}
              </div>
            )}
          </div>

        </div>
      ))}
    </div>
  );
}
