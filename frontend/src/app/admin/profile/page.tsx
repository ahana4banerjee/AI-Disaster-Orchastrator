"use client";

import React from "react";
import { User, Shield } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Operator Credentials</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Verify active administrative credentials, security clearance level, and command group coordinates.
          </p>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs max-w-xl space-y-4">
        <div className="flex items-center gap-4 border-b border-border-custom pb-4">
          <div className="h-16 w-16 bg-accent-primary/10 rounded-full border border-accent-primary flex items-center justify-center">
            <User className="h-8 w-8 text-accent-primary" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">Emergency Ops Specialist</h3>
            <span className="text-[10px] text-text-secondary font-mono">eoc@agency.gov</span>
          </div>
        </div>

        <div className="space-y-3 font-sans text-xs">
          <div className="flex justify-between border-b border-border-custom pb-2">
            <span className="text-text-secondary uppercase font-bold text-[9px] tracking-wider">Operational Clearance</span>
            <span className="font-bold text-severity-extreme flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> SECURE ROOT / ADMIN
            </span>
          </div>
          <div className="flex justify-between border-b border-border-custom pb-2">
            <span className="text-text-secondary uppercase font-bold text-[9px] tracking-wider">Assigned Command Node</span>
            <span className="font-bold text-text-primary">EOC-East-04</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary uppercase font-bold text-[9px] tracking-wider">Session Key Expiry</span>
            <span className="font-mono text-text-primary">30 Minutes (JWT TTL active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
