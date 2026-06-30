"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Award,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ReadinessProfile {
  userId: string;
  checkedItems: string[];
  score: number;
  updatedAt: string;
}

const WIZARD_STEPS = [
  { id: 1, title: "Family & Communication" },
  { id: 2, title: "Emergency Supplies" },
  { id: 3, title: "Finance & Health Logistics" },
  { id: 4, title: "EOC Scorecard" }
];

const CHECKLIST_ITEMS = [
  {
    key: "family_plan",
    step: 1,
    question: "Do you have a documented household evacuation and communication plan?",
    description: "A pre-arranged plan detailing escape routes, assembly zones, and contact points.",
  },
  {
    key: "emergency_contacts",
    step: 1,
    question: "Do you have a pre-configured list of local emergency contacts?",
    description: "Includes contacts for nearest hospitals, local fire stations, police, and regional EOC.",
  },
  {
    key: "water_3_days",
    step: 2,
    question: "Do you have a minimum of 3 days of clean water (1 gallon/person/day)?",
    description: "Critical resource supply to maintain basic hydration and sanitation during cuts.",
  },
  {
    key: "food_3_days",
    step: 2,
    question: "Do you have a minimum of 3 days of non-perishable food supplies?",
    description: "Ready-to-eat foods that do not require refrigeration, cooking, or clean water to prepare.",
  },
  {
    key: "first_aid_kit",
    step: 2,
    question: "Do you have a fully equipped and accessible first aid kit?",
    description: "Includes bandages, sterile wipes, antiseptics, and emergency medical tools.",
  },
  {
    key: "flashlight_batteries",
    step: 2,
    question: "Do you have emergency flashlights and extra working batteries?",
    description: "Essential for navigating structural power outages safely.",
  },
  {
    key: "hand_crank_radio",
    step: 2,
    question: "Do you have a battery-powered or hand-crank emergency radio?",
    description: "Used to receive critical weather advisories and local EOC guidance during outages.",
  },
  {
    key: "copies_documents",
    step: 3,
    question: "Do you have copies of crucial personal documents in water-resistant sleeves?",
    description: "Includes passports, IDs, deeds, insurance policy pages, and medical summaries.",
  },
  {
    key: "cash_reserves",
    step: 3,
    question: "Do you maintain emergency cash reserves at home?",
    description: "ATMs and electronic checkout terminals may go offline during grid failovers.",
  },
  {
    key: "medical_supplies",
    step: 3,
    question: "Do you have at least a 14-day supply of prescription medications?",
    description: "Maintains standard medical safety for household members dependent on daily drugs.",
  }
];

export default function ReadinessAssessment() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Authenticate and load profile
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    setToken(savedToken);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    fetchProfile(savedToken);
  }, []);

  const fetchProfile = async (authToken: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/public/readiness", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCheckedItems(data.checkedItems || []);
        setScore(data.score || 0);
        setStatusMessage({ text: "READINESS PROFILE SYNCHRONIZED SUCCESSFULLY.", type: "success" });
      } else if (res.status === 401) {
        setToken(null);
        localStorage.removeItem("token");
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      // Local recovery fallback loading from localStorage
      const cached = localStorage.getItem("readiness_cached_items");
      if (cached) {
        const items = JSON.parse(cached);
        setCheckedItems(items);
        calculateLocalScore(items);
      }
      setStatusMessage({ text: "API OFFLINE. LOCAL PERSISTENT PROFILE ACTIVE.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalScore = (items: string[]) => {
    const standardKeys = new Set(CHECKLIST_ITEMS.map((c) => c.key));
    const matched = items.filter((x) => standardKeys.has(x)).length;
    setScore(Math.round((matched / 10) * 100));
  };

  // PUT updates on step transitions (step-wise session saves)
  const saveStepProgress = async (itemsList: string[]) => {
    localStorage.setItem("readiness_cached_items", JSON.stringify(itemsList));
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/api/v1/public/readiness", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ checkedItems: itemsList })
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.score);
      }
    } catch (err) {
      calculateLocalScore(itemsList);
    }
  };

  const handleToggle = (key: string) => {
    const updated = checkedItems.includes(key)
      ? checkedItems.filter((x) => x !== key)
      : [...checkedItems, key];
    setCheckedItems(updated);
    saveStepProgress(updated);
  };

  const handleNext = () => {
    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleReset = () => {
    setCheckedItems([]);
    setScore(0);
    setActiveStep(1);
    saveStepProgress([]);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mx-auto"></div>
          <span className="text-xs font-mono font-bold text-text-secondary uppercase">Synchronizing safety profile...</span>
        </div>
      </div>
    );
  }

  // Unauthorized page guard
  if (!token) {
    return (
      <div className="flex-1 w-full max-w-[600px] mx-auto px-6 py-16 font-sans select-none animate-fadeIn flex flex-col justify-center min-h-[500px]">
        <Card className="p-8 text-center space-y-6 border border-border-custom bg-bg-secondary">
          <div className="p-4 rounded-full bg-severity-high/10 border border-severity-high/20 w-fit mx-auto">
            <Lock className="h-10 w-10 text-severity-high" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">
              Authentication Required
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Establishing a standardized EOC readiness profile requires citizen authentication. Please sign in to verify your checklist and save progression.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login" className="inline-block w-full">
              <Button variant="primary" className="w-full h-11 text-xs font-bold uppercase tracking-wider">
                Sign In to Platform
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Filter checklist items for the current wizard step
  const stepItems = CHECKLIST_ITEMS.filter((item) => item.step === activeStep);

  // Score description mapping
  const getScoreDetails = () => {
    if (score < 40) {
      return {
        level: "Poor Readiness",
        color: "text-severity-extreme",
        progressColor: "#ef4444",
        alertBg: "bg-severity-extreme/10 border-severity-extreme/20",
        guidance: "CRITICAL DEFICITS LOGGED. Your household is highly vulnerable to utility outages and emergency evacuations. Secure water supplies and formalize evacuation drills immediately."
      };
    }
    if (score < 70) {
      return {
        level: "Moderate Readiness",
        color: "text-severity-moderate",
        progressColor: "#f59e0b",
        alertBg: "bg-severity-moderate/10 border-severity-moderate/20",
        guidance: "PARTIAL PREPAREDNESS ACTIVE. Basic survival supplies are checked, but critical documentation, medical logs, or emergency cash reserves are missing. Address Phase 3 steps next."
      };
    }
    return {
      level: "Excellent Readiness",
      color: "text-severity-low",
      progressColor: "#10b981",
      alertBg: "bg-severity-low/10 border-severity-low/20",
      guidance: "EOC STANDARDS COMPLIED. Your preparedness plan meets emergency command safety recommendations. Maintain kit inspections and check batteries periodically."
    };
  };

  const scoreDetails = getScoreDetails();
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn">
      
      {/* breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Readiness Wizard</span>
      </div>

      {/* Sync status beacon */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 ${
          statusMessage.type === "success" 
            ? "bg-severity-low/10 text-severity-low border-severity-low/20"
            : "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20"
        }`}>
          <Database className="h-4 w-4 animate-pulse shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Wizard Steps Indicator Bar */}
      <div className="mb-8 grid grid-cols-4 gap-2 border-b border-border-custom pb-4">
        {WIZARD_STEPS.map((step) => {
          const isCompleted = activeStep > step.id;
          const isActive = activeStep === step.id;

          return (
            <div key={step.id} className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className={isActive ? "text-accent-primary" : "text-text-secondary"}>
                  Step 0{step.id}
                </span>
                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-severity-low" />}
              </div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${
                isActive ? "bg-accent-primary" : isCompleted ? "bg-severity-low" : "bg-bg-secondary border border-border-custom"
              }`}></div>
              <span className="hidden sm:block text-[9px] font-bold text-text-muted uppercase tracking-wide truncate">
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Steps Content Panel */}
      {activeStep <= 3 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Question Forms Panel */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 space-y-6 bg-bg-secondary border border-border-custom">
              <div className="border-b border-border-custom pb-4">
                <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">
                  {WIZARD_STEPS[activeStep - 1].title}
                </h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Toggle checklist elements to audit your household's disaster readiness parameters. Your selections are automatically synced.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {stepItems.map((item) => {
                  const isChecked = checkedItems.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      className={`flex gap-4 items-start p-4 rounded-xl border border-border-custom/50 bg-bg-primary/20 hover:bg-bg-primary/60 transition cursor-pointer select-none ${
                        isChecked ? "border-accent-primary/40 bg-bg-primary/40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(item.key)}
                        className="h-4.5 w-4.5 rounded border-border-custom text-accent-primary focus:ring-accent-primary mt-0.5 cursor-pointer accent-accent-primary shrink-0"
                      />
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-text-primary uppercase leading-tight tracking-tight">
                          {item.question}
                        </span>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between pt-4 border-t border-border-custom/50">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  disabled={activeStep === 1}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-10 px-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>

                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider h-10 px-5"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

            </Card>
          </div>

          {/* Right helper explanation card */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 space-y-4 border-l-4 border-l-accent-primary">
              <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded uppercase tracking-wider">
                EOC Directives
              </span>
              <h4 className="text-xs font-bold uppercase text-text-primary tracking-wide">
                Why this audit matters
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Emergency commands depend on citizen preparedness to optimize logistics. By completing this readiness wizard, you catalog your safety score and help local responders plan shelter support capacities.
              </p>
            </Card>
          </div>

        </div>
      ) : (
        /* Step 4: Scoreboard & radial gauge */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left panel: Scoreboard radial gauge */}
          <Card className="lg:col-span-5 p-8 flex flex-col justify-between items-center text-center bg-bg-secondary border border-border-custom min-h-[440px]">
            <div className="w-full space-y-1">
              <span className="text-[9px] font-mono font-bold bg-bg-primary text-text-secondary border border-border-custom px-2.5 py-1 rounded uppercase tracking-wider">
                Official EOC Rating
              </span>
              <h3 className="text-md font-bold uppercase tracking-tight text-text-primary pt-2">
                Household Readiness Score
              </h3>
            </div>

            {/* SVG circular gauge */}
            <div className="relative flex items-center justify-center my-6">
              <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                <circle
                  stroke="rgba(255,255,255,0.03)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                <circle
                  stroke={scoreDetails.progressColor}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + " " + circumference}
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-text-primary font-mono">{score}%</span>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">Ready</p>
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <h4 className={`text-sm font-black uppercase ${scoreDetails.color}`}>
                {scoreDetails.level}
              </h4>
              <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                Audited checklist compliance
              </p>
            </div>
          </Card>

          {/* Right panel: Dynamic checklists details and recommendations */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* EOC suggestions panel */}
            <Card className="p-6 flex-1 space-y-6 bg-bg-secondary border border-border-custom flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed font-medium ${scoreDetails.alertBg}`}>
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{scoreDetails.guidance}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-accent-primary" />
                    Audited Milestones Summary
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold font-mono text-text-secondary uppercase">
                    <div className="p-3 bg-bg-primary/40 border border-border-custom/50 rounded-lg flex justify-between items-center">
                      <span>Completed Steps:</span>
                      <span className="text-accent-primary">{checkedItems.length} / 10</span>
                    </div>
                    <div className="p-3 bg-bg-primary/40 border border-border-custom/50 rounded-lg flex justify-between items-center">
                      <span>Score Tier:</span>
                      <span className={scoreDetails.color}>{score >= 70 ? "Excellent" : score >= 40 ? "Moderate" : "Poor"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-border-custom/50">
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider h-11"
                >
                  <RefreshCwIcon className="h-4 w-4" /> Reset Assessment
                </Button>
                <Link href="/preparedness" className="flex-1">
                  <Button
                    variant="primary"
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider h-11"
                  >
                    <Zap className="h-4 w-4" /> Generate Packing PDF
                  </Button>
                </Link>
              </div>

            </Card>
          </div>

        </div>
      )}

    </div>
  );
}

// Icon wrapper to bypass next compilation warnings
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
