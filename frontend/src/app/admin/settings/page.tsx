"use client";

import React, { useState } from "react";
import { Settings, Save, ShieldAlert } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [modelWeight, setModelWeight] = useState("0.40");
  const [cacheTtl, setCacheTtl] = useState("1800");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Configurations committed to central database.");
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border-custom pb-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">System Configurations</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Fine-tune ML weights models variables thresholds, cache registry coordinates, and warning protocols.
          </p>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="border-b border-border-custom pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary font-mono flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-accent-secondary" /> Model & Cache Thresholds
            </h3>
          </div>

          <Input
            label="XGBoost Death Model Weight Coeff"
            type="number"
            step="0.05"
            value={modelWeight}
            onChange={(e) => setModelWeight(e.target.value)}
            required
            id="model-weight"
          />

          <Input
            label="Redis Caching Intercept TTL (Seconds)"
            type="number"
            value={cacheTtl}
            onChange={(e) => setCacheTtl(e.target.value)}
            required
            id="cache-ttl"
          />

          <Select label="Default Notification Severity Alert Level" id="alert-level">
            <option value="high">High & Above Only</option>
            <option value="extreme">Extreme & Above Only</option>
            <option value="all">Log All Anomalies</option>
          </Select>

          <Button type="submit" className="flex items-center gap-1.5 mt-2">
            <Save className="h-4 w-4" /> Save Configurations
          </Button>
        </form>
      </div>
    </div>
  );
}
