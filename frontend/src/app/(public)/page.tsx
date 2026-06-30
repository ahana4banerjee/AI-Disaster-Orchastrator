"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Compass,
  ClipboardCheck,
  BookOpen,
  ArrowRight,
  Activity,
  Award,
  Globe2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PublicHomePage() {
  const [stats, setStats] = React.useState({
    totalEvents: 16789,
    highRiskEvents: 1420,
    averageDeaths: 28.5,
    averageDamageUSD: 1450000,
  });

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Attempt to load live statistics if the user is authenticated
    const fetchKPIs = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("http://localhost:8000/api/v1/analytics/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        // Fall back to historical database stats
      } finally {
        setLoading(false);
      }
    };
    fetchKPIs();
  }, []);

  const features = [
    {
      title: "Personal Risk Checker",
      description: "Analyze regional hazard matrices and historical disaster frequencies targeting your specific region.",
      href: "/risk-checker",
      icon: ShieldAlert,
      tag: "Immediate Action",
    },
    {
      title: "Nearby Disaster Explorer",
      description: "Perform coordinate geospatial queries to locate disaster logs and anomalies in your vicinity.",
      href: "/disaster-explorer",
      icon: Compass,
      tag: "Geospatial telemetry",
    },
    {
      title: "Readiness Assessment",
      description: "Answer diagnostic checklists to calculate your family preparedness level and score (0–100).",
      href: "/readiness",
      icon: ClipboardCheck,
      tag: "Self Evaluation",
    },
    {
      title: "Disaster Awareness Hub",
      description: "Study safety metrics, warning indicators, and protective actions against floods, cyclones, and earthquakes.",
      href: "/awareness",
      icon: BookOpen,
      tag: "Preparedness guides",
    },
  ];

  return (
    <div className="flex-1 w-full font-sans transition-colors duration-150 select-none">
      
      {/* Hero Section */}
      <section className="border-b border-border-custom bg-bg-secondary py-16 px-6">
        <div className="max-w-[1200px] mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-accent-primary text-[10px] font-bold uppercase tracking-wider">
            <Globe2 className="h-3 w-3 animate-spin" /> EOC Public Intelligence Portal
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary leading-tight max-w-[800px] mx-auto">
            Operational Disaster Intelligence. <br />
            <span className="text-accent-primary">Preparedness for Every Citizen.</span>
          </h2>
          <p className="text-xs md:text-sm text-text-secondary max-w-[600px] mx-auto leading-relaxed">
            Access EOC databases, calculate regional threat index matrices, map historical event timelines, and construct validated evacuation plans.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link href="/risk-checker">
              <Button variant="primary" className="w-full sm:w-auto flex items-center gap-2">
                Launch Risk Assessment <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/disaster-explorer">
              <Button variant="outline" className="w-full sm:w-auto">
                Explore Historical Data
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Global telemetry statistics grid */}
      <section className="py-12 px-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-l-4 border-l-accent-purple">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Historical Records</span>
              <Globe2 className="h-4 w-4" />
            </div>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight">
              {loading ? "..." : stats.totalEvents.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">EM-DAT Global Events</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-severity-extreme">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Extreme Hazards</span>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight">
              {loading ? "..." : stats.highRiskEvents.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Critical Severity class</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-accent-teal">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Avg Incident Fatalities</span>
              <Activity className="h-4 w-4" />
            </div>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight">
              {loading ? "..." : stats.averageDeaths.toFixed(1)}
            </p>
            <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Casualties Per Event</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-severity-moderate">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">Average Damaged Cost</span>
              <Award className="h-4 w-4" />
            </div>
            <p className="text-2xl font-extrabold text-text-primary tracking-tight">
              {loading ? "..." : `$${(stats.averageDamageUSD / 1000000).toFixed(2)}M`}
            </p>
            <p className="text-[10px] text-text-muted font-semibold uppercase mt-1">Adjusted Damage USD</p>
          </Card>
        </div>
      </section>

      {/* Snapshot features navigator */}
      <section className="py-12 px-6 border-t border-border-custom bg-bg-primary">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="text-center md:text-left space-y-2">
            <h3 className="text-xl font-extrabold tracking-tight text-text-primary uppercase">
              Preparedness Modules
            </h3>
            <p className="text-xs text-text-secondary">
              Select an operational dashboard to evaluate vulnerability risk factors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card key={feat.title} className="p-6 hover:shadow-md transition duration-250 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="h-10 w-10 bg-accent-primary/10 border border-accent-primary/20 rounded-xl flex items-center justify-center text-accent-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold bg-bg-primary text-text-muted border border-border-custom px-2 py-0.5 rounded-sm uppercase tracking-wider">
                        {feat.tag}
                      </span>
                      <h4 className="text-sm font-bold text-text-primary pt-1.5 uppercase">
                        {feat.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary leading-relaxed pt-1">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6">
                    <Link href={feat.href}>
                      <Button variant="secondary" className="w-full text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 h-9">
                        Configure <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preparedness CTA banner */}
      <section className="bg-accent-primary text-white py-16 px-6 border-t border-border-custom text-center">
        <div className="max-w-[800px] mx-auto space-y-6">
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
            Are You Prepared for a Crisis Event?
          </h3>
          <p className="text-xs md:text-sm text-indigo-100 max-w-[600px] mx-auto leading-relaxed">
            Create your account today to save custom evacuation plans, calculate your family readiness score gauge, and receive localized emergency alerts.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button className="w-full sm:w-auto bg-white hover:bg-slate-100 text-accent-primary border-none">
                Register Preparedness Account
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full sm:w-auto bg-transparent hover:bg-indigo-750 text-white border border-indigo-200">
                Operator Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
