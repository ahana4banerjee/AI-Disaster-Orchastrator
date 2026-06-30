"use client";

import React from "react";
import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border-custom text-text-secondary select-none transition-colors duration-150 py-10 mt-auto">
      <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Portal Branding info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-accent-primary rounded-md flex items-center justify-center text-white font-bold text-sm">
              Ω
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-text-primary">
              Disaster Intel
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Emergency Operations Center citizen portal providing data-driven hazard forecasts, readiness planning trackers, and historical crisis mapping.
          </p>
        </div>

        {/* Preparedness Quick links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Citizen Preparedness
          </h4>
          <ul className="text-[11px] space-y-1.5 font-semibold">
            <li>
              <Link href="/risk-checker" className="hover:text-accent-primary transition">
                Personal Risk Scorecard
              </Link>
            </li>
            <li>
              <Link href="/readiness" className="hover:text-accent-primary transition">
                Readiness Diagnostic Quiz
              </Link>
            </li>
            <li>
              <Link href="/family-planner" className="hover:text-accent-primary transition">
                Evacuation Family Planner
              </Link>
            </li>
            <li>
              <Link href="/preparedness" className="hover:text-accent-primary transition">
                Custom Emergency Supplies
              </Link>
            </li>
          </ul>
        </div>

        {/* Regional Intelligence links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Regional Analysis
          </h4>
          <ul className="text-[11px] space-y-1.5 font-semibold">
            <li>
              <Link href="/disaster-explorer" className="hover:text-accent-primary transition">
                Geospatial Nearby Search
              </Link>
            </li>
            <li>
              <Link href="/awareness" className="hover:text-accent-primary transition">
                Disaster Awareness Matrix
              </Link>
            </li>
            <li>
              <Link href="/insights" className="hover:text-accent-primary transition">
                K-Means Risk Clusters
              </Link>
            </li>
            <li>
              <Link href="/assistant" className="hover:text-accent-primary transition">
                Preparedness AI Chatbot
              </Link>
            </li>
          </ul>
        </div>

        {/* Administration specifications */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Operational Desk
          </h4>
          <p className="text-[10px] text-text-muted font-mono leading-relaxed">
            SYSTEM TELEMETRY: ACTIVE<br />
            TARGET BASE: EM-DAT GLOBAL RECORDS<br />
            API GATEWAY: SECURE PORT 8000<br />
            ML INFERENCE: PORT 8001
          </p>
          <div className="pt-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center justify-center px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/20 rounded-md text-[10px] font-bold uppercase tracking-wider transition"
            >
              Control Room Login
            </Link>
          </div>
        </div>

      </div>

      <div className="max-w-[1600px] mx-auto px-6 border-t border-border-custom mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-text-muted font-semibold tracking-wide">
        <p>© {currentYear} Disaster Intelligence EOC System. All rights reserved.</p>
        <div className="flex gap-4 mt-2 sm:mt-0 uppercase">
          <Link href="/about" className="hover:text-text-primary">About Platform</Link>
          <span className="text-border-custom">|</span>
          <span className="font-mono text-[9px]">CLEARANCE LEVEL: PUBLIC</span>
        </div>
      </div>
    </footer>
  );
}
