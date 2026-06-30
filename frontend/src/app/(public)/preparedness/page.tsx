"use client";

import React from "react";
import Link from "next/link";
import { ClipboardList, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PreparednessPlaceholder() {
  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-12 font-sans select-none">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Preparedness</span>
      </div>

      <Card className="p-8 border-l-4 border-l-accent-purple space-y-6">
        <div className="h-12 w-12 bg-accent-purple/10 border border-accent-purple/20 rounded-2xl flex items-center justify-center text-accent-purple">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-primary uppercase">
            Preparedness Assistant
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[600px]">
            This module generates customized emergency checklists and survival guides mapping specific regional hazards. Complete system mapping is scheduled in a future step.
          </p>
        </div>
        <div className="pt-4 flex gap-3">
          <Link href="/">
            <Button variant="secondary" className="h-10 text-[10px] font-bold uppercase tracking-wider">
              Return to Control Panel
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
