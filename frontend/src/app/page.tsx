"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle, ChevronRight, Activity, Globe } from "lucide-react";
import PublicHomePage from "./(public)/page";
import { PublicNavbar } from "@/components/ui/PublicNavbar";
import { PublicFooter } from "@/components/ui/PublicFooter";

export default function RootHomePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const token = localStorage.getItem("token");
    if (token && storedRole) {
      setRole(storedRole);
      if (storedRole === "admin") {
        router.replace("/admin/dashboard");
        return;
      }
    } else {
      // Clear roles if no token exists to be safe
      setRole(null);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center font-sans">
        <div className="text-xs font-mono text-text-secondary uppercase">
          Initializing telemetry link...
        </div>
      </div>
    );
  }

  if (role === "public_user") {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-150 font-sans">
        <PublicNavbar />
        <main className="flex-1 flex flex-col w-full">
          <PublicHomePage />
        </main>
        <PublicFooter />
      </div>
    );
  }

  // Otherwise, render the EOC welcome gate page
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-between font-sans transition-colors duration-150">
      {/* Header Navigation */}
      <header className="h-20 border-b border-border-custom bg-bg-secondary px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-accent-primary rounded-xl flex items-center justify-center text-white font-bold text-base">
            Ω
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wider uppercase">
              Disaster Intel
            </h1>
            <p className="text-[10px] text-accent-secondary font-semibold uppercase tracking-wider -mt-0.5">
              Decision Support Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary px-4 py-2 transition"
          >
            Access Control Room
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold bg-accent-primary hover:bg-indigo-750 text-white px-5 py-2.5 rounded-xl transition"
          >
            Create Citizen Profile
          </Link>
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 flex flex-col justify-center">
        {/* Urgent Announcement Banner */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-severity-extreme/10 border border-severity-extreme/20 text-severity-extreme text-xs font-semibold mb-8 max-w-fit">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Active Command: System Monitoring Global Climatic Anomalies</span>
        </div>

        {/* Hero Title */}
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary mb-6 leading-tight">
          Operational Intelligence & <br />
          <span className="text-accent-primary">Disaster Decision Support</span>
        </h2>

        <p className="text-text-secondary text-sm md:text-base max-w-2xl mb-12 leading-relaxed">
          Federal-grade crisis management engine. Provides regional hazard index monitoring, cascade outages simulation, logistical deficit tracking, and automated AI situation reports (SitReps) to optimize response efficiency.
        </p>

        {/* Operational Statistics Grid */}
        <div className="mb-16">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
            Global Crisis Snapshot
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Events", value: "16,842", desc: "Aggregated EM-DAT historical records", icon: Globe },
              { label: "High Risk Regions", value: "84", desc: "Active monitoring zones", icon: Shield },
              { label: "Most Common Hazards", value: "Floods/Storms", desc: "68% of logged anomalies", icon: AlertCircle },
              { label: "Global Impact Index", value: "CRITICAL", desc: "Combined structural severity", icon: Activity },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-bg-secondary border border-border-custom rounded-xl p-5 shadow-xs flex flex-col justify-between h-[120px]"
                >
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                    <Icon className="h-4 w-4 text-accent-secondary" />
                  </div>
                  <div>
                    <span className="text-xl font-black font-mono tracking-tight text-text-primary">
                      {stat.value}
                    </span>
                    <p className="text-[9px] text-text-muted mt-0.5">{stat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel and Preparedness Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="md:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-2">
                EOC Agency Core Operations
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed mb-6">
                Authorized operators can launch simulations of critical cascading failures (power grid outages, hospital overload, and road blockages) and generate standard briefs.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="px-5 py-2.5 bg-accent-primary hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                Enter Control Room <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border-custom rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-2">
                Citizen Readiness
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed mb-6">
                Access self-assessment checklists, calculate household preparedness scorecards, and compile structured family evacuation plans.
              </p>
            </div>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-transparent hover:bg-bg-primary text-text-primary border border-border-custom text-xs font-bold rounded-xl transition text-center"
            >
              Configure Profile
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-border-custom bg-bg-secondary px-8 flex items-center justify-between text-[11px] text-text-secondary select-none">
        <span>© 2026 Disaster Intelligence Platform. System Core v1.0.0</span>
        <span className="font-mono">Security Level: Authorized Access Only</span>
      </footer>
    </div>
  );
}
