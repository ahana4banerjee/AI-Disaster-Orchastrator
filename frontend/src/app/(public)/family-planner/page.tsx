"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Printer,
  Save,
  Database,
  Lock,
  Users,
  PhoneCall,
  MapPin,
  HeartPulse,
  Plus,
  Trash2,
  Award,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface FamilyPlan {
  memberCount: number;
  contacts: string;
  evacuationRoute: string;
  medicalNeeds: string;
  petAssistance: string;
}

export default function FamilyEmergencyPlanner() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"household" | "contacts" | "evacuation" | "medical" | "plan">("household");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Consolidated form state to guarantee tab switching never wipes values
  const [formData, setFormData] = useState<FamilyPlan>({
    memberCount: 1,
    contacts: "",
    evacuationRoute: "",
    medicalNeeds: "",
    petAssistance: ""
  });

  // Contact list helper state for Step 2 UI (compiled into JSON string when posting)
  const [contactsList, setContactsList] = useState<{ name: string; relation: string; phone: string }[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    setToken(savedToken);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    fetchFamilyPlan(savedToken);
  }, []);

  const fetchFamilyPlan = async (authToken: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/public/family-plan", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          memberCount: data.memberCount || 1,
          contacts: data.contacts || "",
          evacuationRoute: data.evacuationRoute || "",
          medicalNeeds: data.medicalNeeds || "",
          petAssistance: data.petAssistance || ""
        });
        
        // Parse contacts helper if formatted as JSON
        try {
          if (data.contacts) {
            const parsed = JSON.parse(data.contacts);
            if (Array.isArray(parsed)) {
              setContactsList(parsed);
            } else {
              setContactsList([{ name: "Primary Contact", relation: "Family", phone: data.contacts }]);
            }
          }
        } catch {
          if (data.contacts) {
            setContactsList([{ name: "Primary Contact", relation: "Family", phone: data.contacts }]);
          }
        }
        
        setStatusMessage({ text: "FAMILY EMERGENCY PLAN RETRIEVED FROM BACKEND.", type: "success" });
      } else if (res.status === 404) {
        setStatusMessage({ text: "NO ACTIVE PLAN FOUND. CREATING NEW PROFILE TEMPLATE.", type: "warning" });
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch (err) {
      // Local fallback caching
      const cached = localStorage.getItem("family_plan_cached");
      if (cached) {
        const data = JSON.parse(cached);
        setFormData(data);
        try {
          const parsed = JSON.parse(data.contacts);
          setContactsList(parsed);
        } catch {
          setContactsList([]);
        }
      }
      setStatusMessage({ text: "LOCAL PLAN CACHE STREAM ACTIVE.", type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    // Compile contacts array into text payload
    const compiledContacts = JSON.stringify(contactsList);
    const payload = {
      ...formData,
      contacts: compiledContacts
    };

    localStorage.setItem("family_plan_cached", JSON.stringify(payload));

    if (!token) {
      setSaving(false);
      setStatusMessage({ text: "PLAN SAVED LOCALLY. AUTHENTICATE TO SYNC WITH SERVER.", type: "warning" });
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/v1/public/family-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatusMessage({ text: "FAMILY EMERGENCY PLAN COMPILATION SAVED.", type: "success" });
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch {
      setStatusMessage({ text: "SERVER UPDATE TIMED OUT. PLAN PERSISTED LOCALLY.", type: "warning" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setActiveTab("plan");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleAddContact = () => {
    setContactsList([...contactsList, { name: "", relation: "", phone: "" }]);
  };

  const handleRemoveContact = (idx: number) => {
    setContactsList(contactsList.filter((_, i) => i !== idx));
  };

  const handleContactChange = (idx: number, field: "name" | "relation" | "phone", value: string) => {
    const next = [...contactsList];
    next[idx][field] = value;
    setContactsList(next);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 font-sans flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin mx-auto"></div>
          <span className="text-xs font-mono font-bold text-text-secondary uppercase">Loading planner data...</span>
        </div>
      </div>
    );
  }

  // Guard page for unauthorized users
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
              Constructing a family emergency plan requires authentication. Please sign in to verify your parameters and access database persistence.
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

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn print:px-0 print:py-4">
      
      {/* breadcrumb (hidden on print) */}
      <div className="flex items-center gap-2 mb-6 print:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">Family Planner</span>
      </div>

      {/* Sync status (hidden on print) */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-3 print:hidden ${
          statusMessage.type === "success" 
            ? "bg-severity-low/10 text-severity-low border-severity-low/20"
            : "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20"
        }`}>
          <Database className="h-4 w-4 animate-pulse shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header card with action items */}
      <Card className="mb-8 p-6 border-l-4 border-l-accent-primary print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded-sm uppercase tracking-wider print:hidden">
              EOC Planner Suite
            </span>
            <h2 className="text-xl font-black text-text-primary uppercase tracking-tight pt-2 print:text-2xl">
              Family Emergency Plan
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed max-w-[620px] pt-1">
              Document your household details, emergency contacts, primary/secondary evacuation routes, and critical medical instructions.
            </p>
          </div>

          <div className="flex gap-2 print:hidden self-end sm:self-center">
            <Button
              variant="secondary"
              className="h-9 px-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" /> Print Plan
            </Button>
            <Button
              variant="primary"
              className="h-9 px-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab controls (hidden on print) */}
      <div className="flex gap-2 border-b border-border-custom pb-px mb-6 print:hidden">
        {[
          { id: "household", label: "Household Details", icon: Users },
          { id: "contacts", label: "Emergency Contacts", icon: PhoneCall },
          { id: "evacuation", label: "Evacuation Routes", icon: MapPin },
          { id: "medical", label: "Medical Rules", icon: HeartPulse },
          { id: "plan", label: "Generated EOC Plan", icon: ShieldCheck },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer -mb-px ${
                isSelected
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Tabs Panels Container */}
      <div className="space-y-6 print:space-y-6">
        
        {/* Tab 1: Household Details */}
        {(activeTab === "household" || typeof window === "undefined" || window.matchMedia("print").matches) && (
          <Card className={`p-6 space-y-6 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0 ${
            activeTab !== "household" ? "hidden print:block" : ""
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-custom pb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-primary" />
              Household Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Number of Household Members
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.memberCount}
                  onChange={(e) => setFormData({ ...formData, memberCount: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full h-11 bg-bg-primary border border-border-custom rounded-lg px-4 text-xs font-bold text-text-primary focus:ring-accent-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Pet Care and Assistance Protocols
                </label>
                <TextArea
                  value={formData.petAssistance}
                  onChange={(e) => setFormData({ ...formData, petAssistance: e.target.value })}
                  placeholder="Specify cages, animal food supply, vaccination histories, or transport plans during evacuation..."
                  rows={4}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Tab 2: Emergency Contacts */}
        {(activeTab === "contacts" || typeof window === "undefined" || window.matchMedia("print").matches) && (
          <Card className={`p-6 space-y-6 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0 ${
            activeTab !== "contacts" ? "hidden print:block" : ""
          }`}>
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-accent-primary" />
                Emergency Contacts Log
              </h4>
              <Button
                variant="secondary"
                className="h-8 px-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider print:hidden"
                onClick={handleAddContact}
              >
                <Plus className="h-3.5 w-3.5" /> Add Contact
              </Button>
            </div>

            <div className="space-y-4">
              {contactsList.map((contact, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-xl border border-border-custom/50 bg-bg-primary/20 print:border-none print:bg-transparent print:p-0">
                  <div className="sm:col-span-4">
                    <Input
                      label="Contact Name"
                      value={contact.name}
                      onChange={(e) => handleContactChange(idx, "name", e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      label="Relationship"
                      value={contact.relation}
                      onChange={(e) => handleContactChange(idx, "relation", e.target.value)}
                      placeholder="e.g. Brother, Neighbor"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      label="Phone Number"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(idx, "phone", e.target.value)}
                      placeholder="e.g. 555-0199"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1 print:hidden pb-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(idx)}
                      className="p-2.5 rounded-lg border border-border-custom text-severity-high bg-bg-secondary hover:bg-severity-high/10 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {contactsList.length === 0 && (
                <div className="text-center py-6 text-xs text-text-muted">
                  No emergency contacts configured yet. Add one above.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Tab 3: Evacuation Routes */}
        {(activeTab === "evacuation" || typeof window === "undefined" || window.matchMedia("print").matches) && (
          <Card className={`p-6 space-y-6 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0 ${
            activeTab !== "evacuation" ? "hidden print:block" : ""
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-custom pb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent-primary" />
              Evacuation Routes & Assembly Points
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Primary and Secondary Assembly Locations
              </label>
              <TextArea
                value={formData.evacuationRoute}
                onChange={(e) => setFormData({ ...formData, evacuationRoute: e.target.value })}
                placeholder="Identify exact meeting spots, backup shelters, coordinates, or regional high ground areas..."
                rows={5}
              />
            </div>
          </Card>
        )}

        {/* Tab 4: Medical Rules */}
        {(activeTab === "medical" || typeof window === "undefined" || window.matchMedia("print").matches) && (
          <Card className={`p-6 space-y-6 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0 ${
            activeTab !== "medical" ? "hidden print:block" : ""
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-custom pb-2 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-accent-primary" />
              Medical Rules & Care Instructions
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Prescription Schedules and Critical Health Needs
              </label>
              <TextArea
                value={formData.medicalNeeds}
                onChange={(e) => setFormData({ ...formData, medicalNeeds: e.target.value })}
                placeholder="List household medical diagnoses, prescription drug names, allergy items, or special mobility requirements during evacuation..."
                rows={5}
              />
            </div>
          </Card>
        )}

        {/* Tab 5: Generated EOC Plan */}
        {(activeTab === "plan" || typeof window === "undefined" || window.matchMedia("print").matches) && (
          <Card className={`p-8 space-y-6 bg-bg-secondary border border-border-custom print:border-none print:shadow-none print:p-0 ${
            activeTab !== "plan" ? "hidden print:block" : ""
          }`}>
            {/* EOC Double Border Official Header */}
            <div className="border-4 border-double border-accent-primary/40 p-6 text-center space-y-3 rounded-lg print:border-black/30">
              <span className="text-[10px] font-black tracking-widest text-accent-primary uppercase font-mono print:text-black">
                ★ OFFICIAL EMERGENCY PROTOCOL DIRECTIVE ★
              </span>
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight print:text-2xl print:text-black">
                EOC Action & Evacuation Plan
              </h2>
              <div className="flex justify-center gap-4 text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider print:text-black/70">
                <span>Household Size: {formData.memberCount} Members</span>
                <span>•</span>
                <span>Compiled: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Step-by-Step Response Checklist */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary border-b border-border-custom pb-2 flex items-center gap-1.5 print:text-black print:border-black/20">
                <ShieldCheck className="h-4 w-4 text-accent-primary print:hidden" />
                Step-by-Step Action Guidelines
              </h4>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="p-4 rounded-lg bg-bg-primary/20 border border-border-custom/40 space-y-2 print:border-none print:p-0">
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary print:border print:border-black print:text-black">
                      PHASE 1
                    </span>
                    <span className="text-xs font-bold text-text-primary uppercase print:text-black">
                      Immediate Notification & Assembly
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-14 print:text-black print:pl-0">
                    Contact your configured emergency contact directory immediately. Inform them of safety status and initiate family assembly protocol.
                  </p>
                  
                  {/* Contacts sub-cards (pocket directory card) */}
                  {contactsList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-14 pt-2 print:grid-cols-2 print:pl-0">
                      {contactsList.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border-custom bg-bg-secondary/40 space-y-1 print:border-black/25">
                          <span className="text-[10px] font-black text-text-primary uppercase print:text-black">{c.name || "Unnamed Contact"}</span>
                          <div className="flex justify-between text-[9px] font-mono text-text-muted font-bold uppercase print:text-black/70">
                            <span>{c.relation || "Family"}</span>
                            <span>{c.phone || "No Phone"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-lg bg-bg-primary/20 border border-border-custom/40 space-y-2 print:border-none print:p-0">
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary print:border print:border-black print:text-black">
                      PHASE 2
                    </span>
                    <span className="text-xs font-bold text-text-primary uppercase print:text-black">
                      Pet Logistics & Supply Audits
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-14 print:text-black print:pl-0">
                    Retrieve pet carriers, leashes, and emergency rations. Execute the following custom pet protocol:
                    <br />
                    <span className="inline-block mt-1.5 font-semibold text-text-primary border-l-2 border-accent-primary/40 pl-2 italic print:text-black print:border-black">
                      {formData.petAssistance || "No pet evacuation rules configured. Basic carrier safety advised."}
                    </span>
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-lg bg-bg-primary/20 border border-border-custom/40 space-y-2 print:border-none print:p-0">
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary print:border print:border-black print:text-black">
                      PHASE 3
                    </span>
                    <span className="text-xs font-bold text-text-primary uppercase print:text-black">
                      Evacuation Assembly Run
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-14 print:text-black print:pl-0">
                    Shut off main household utility valves (water, gas, electricity) if directed. Move immediately along the designated evacuation paths to your assembly point:
                    <br />
                    <span className="inline-block mt-1.5 font-semibold text-text-primary border-l-2 border-accent-primary/40 pl-2 italic print:text-black print:border-black">
                      {formData.evacuationRoute || "No evacuation route specified. Seek nearest local EOC shelter immediately."}
                    </span>
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-lg bg-bg-primary/20 border border-border-custom/40 space-y-2 print:border-none print:p-0">
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary print:border print:border-black print:text-black">
                      PHASE 4
                    </span>
                    <span className="text-xs font-bold text-text-primary uppercase print:text-black">
                      Medical Compliance & Care
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-14 print:text-black print:pl-0">
                    Verify all medical supply bags are packed. Follow these critical instructions for daily prescriptions or health requirements:
                    <br />
                    <span className="inline-block mt-1.5 font-semibold text-text-primary border-l-2 border-accent-primary/40 pl-2 italic print:text-black print:border-black">
                      {formData.medicalNeeds || "No custom medical needs configured. Standard first aid guidelines apply."}
                    </span>
                  </p>
                </div>

              </div>
            </div>

            {/* EOC Official Signature Line (for printing) */}
            <div className="hidden print:flex justify-between items-end pt-12 text-xs font-mono font-bold text-black/70">
              <div className="border-t border-black/30 w-48 text-center pt-2">
                Citizen Signature
              </div>
              <div className="border-t border-black/30 w-48 text-center pt-2">
                EOC Stamp / Date
              </div>
            </div>

          </Card>
        )}

      </div>

      {/* A4 Print layout stylesheets */}
      <style jsx global>{`
        @media print {
          /* Hide Navbar, breadcrumbs, and standard print-hidden items */
          nav,
          .print\:hidden {
            display: none !important;
          }

          body, html, #__next, .min-h-screen {
            background: white !important;
            color: black !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Force footer to the bottom of the printed page */
          .min-h-screen {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 100vh !important;
          }

          main {
            flex: 1 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .flex-1 {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          /* Enforce public footer horizontal layout with 4 columns just like the website */
          footer {
            margin-top: auto !important;
            background: white !important;
            color: black !important;
            border-top: 1px solid #ccc !important;
            padding-top: 2rem !important;
            padding-bottom: 2rem !important;
            display: block !important;
          }

          footer .grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 2rem !important;
          }

          footer .grid > div {
            display: block !important;
          }

          footer .grid > div p,
          footer .grid > div ul {
            display: block !important;
          }

          footer .grid > div ul li {
            display: list-item !important;
            list-style-type: none !important;
          }

          /* Remove light double borders colors to look solid dark on paper */
          .border-accent-primary\/40 {
            border-color: #000000 !important;
          }
        }
      `}</style>

    </div>
  );
}
