"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Compass,
  Send,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Message {
  sender: "user" | "bot";
  text: string;
  context?: string[];
}

const STARTER_PROMPTS = [
  { text: "How should I prepare for a flood?", label: "Flood Action" },
  { text: "What are volcanic warning signs?", label: "Volcano Indicators" },
  { text: "Tell me about my readiness score", label: "Readiness Quiz" },
  { text: "How to set up a family evacuation plan?", label: "Family Planner" },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I am your **EOC Disaster Intel Assistant**.\n\nI can retrieve emergency evacuation steps, check hazard warning metrics, or compile customized preparedness guides.\n\nAsk me a safety query or pick a prompt below to get started.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat container to focus on fresh replies
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;

    // Append user query message bubble
    const userMsg: Message = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSaving(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/public/ai-assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: data.reply,
            context: data.context || [],
          },
        ]);
      } else {
        throw new Error("HTTP error " + res.status);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ **EOC COMMUNICATION LINK ERROR**: Connection to local safety servers timed out. Please verify network access.",
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const getContextLabel = (route: string) => {
    if (route.startsWith("/awareness/")) {
      const hazard = route.split("/").pop();
      return `View ${hazard?.toUpperCase()} Safety Hub`;
    }
    if (route === "/readiness") return "Access Readiness Quiz Portal";
    if (route === "/family-planner") return "Open Family Planner Configurator";
    if (route === "/preparedness") return "Compile Supplies Packing Guide";
    if (route === "/insights") return "Check Regional Risk Insights";
    if (route === "/awareness") return "Browse Hazard Awareness Guides";
    return "Explore Portal Directory";
  };

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 font-sans select-none animate-fadeIn flex flex-col justify-between min-h-[calc(100vh-140px)]">
      
      {/* Top section with breadcrumb & metadata */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider">
            <Compass className="h-3.5 w-3.5" /> Home
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text-primary text-xs font-semibold uppercase tracking-wider">AI Assistant</span>
        </div>

        <Card className="mb-6 p-6 border-l-4 border-l-accent-primary">
          <span className="text-[9px] font-bold bg-bg-primary text-text-secondary border border-border-custom px-2 py-0.5 rounded uppercase tracking-wider">
            Conversational Portal
          </span>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-tight pt-2">
            EOC Safety Advisor
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed max-w-[700px] pt-1">
            Query safety checklists, local warning signs, or utility guidelines. The chatbot parses historical database records and EM-DAT incident parameters to draft EOC safety bulletins.
          </p>
        </Card>
      </div>

      {/* Main Chat Terminal Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
        
        {/* Chat Console container */}
        <Card className="lg:col-span-8 flex flex-col justify-between border border-border-custom bg-bg-secondary overflow-hidden h-[500px]">
          
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => {
              const isBot = msg.sender === "bot";
              return (
                <div key={idx} className={`flex gap-3 items-start ${isBot ? "" : "flex-row-reverse"}`}>
                  
                  {/* Icon avatar */}
                  <div className={`p-2 rounded-lg shrink-0 border ${
                    isBot 
                      ? "bg-accent-primary/10 border-accent-primary/20 text-accent-primary" 
                      : "bg-bg-primary border-border-custom text-text-secondary"
                  }`}>
                    {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  {/* Speech bubble */}
                  <div className="space-y-3 max-w-[85%]">
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                      isBot 
                        ? "bg-bg-primary/30 border-border-custom/50 text-text-secondary" 
                        : "bg-accent-primary text-white border-accent-primary/20"
                    }`}>
                      
                      {/* Formatted response mapping */}
                      <p className="whitespace-pre-line font-medium leading-relaxed">
                        {msg.text}
                      </p>
                    </div>

                    {/* Dynamic context redirect links */}
                    {isBot && msg.context && msg.context.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.context.map((link) => (
                          <Link key={link} href={link}>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-primary hover:text-accent-secondary border border-accent-primary/30 bg-accent-primary/5 px-2.5 py-1 rounded-lg transition cursor-pointer">
                              {getContextLabel(link)} <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                  </div>

                </div>
              );
            })}

            {/* Simulated typing loader */}
            {sending && (
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-lg shrink-0 border bg-accent-primary/10 border-accent-primary/20 text-accent-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-4 rounded-2xl text-xs bg-bg-primary/30 border border-border-custom/50 text-text-muted flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-bounce delay-75"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-bounce delay-150"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-bounce delay-300"></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Form input send control */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="p-4 border-t border-border-custom bg-bg-primary/40 flex gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask the EOC safety assistant a query..."
              className="flex-1 h-11 bg-bg-secondary border border-border-custom rounded-xl px-4 text-xs font-medium text-text-primary focus:outline-hidden focus:ring-1 focus:ring-accent-primary/30"
              disabled={sending}
            />
            <Button
              type="submit"
              variant="primary"
              className="h-11 w-11 flex items-center justify-center p-0 rounded-xl"
              disabled={sending || !inputText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

        </Card>

        {/* Right side helper info column */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
          <Card className="p-6 space-y-4 border border-border-custom bg-bg-secondary">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent-primary animate-pulse" />
              Suggested Queries
            </h3>
            
            <div className="flex flex-col gap-2">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  className="w-full text-left p-3 rounded-lg border border-border-custom hover:border-accent-primary/45 bg-bg-primary/20 hover:bg-bg-primary/60 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition cursor-pointer"
                  disabled={sending}
                >
                  <span className="block text-[8px] font-black uppercase text-accent-primary font-mono tracking-wider">
                    {prompt.label}
                  </span>
                  <span className="block mt-0.5">{prompt.text}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-severity-moderate bg-bg-secondary flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-severity-moderate shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase text-text-primary tracking-wide">
                Direct EOC Line
              </h4>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                This virtual console is for educational safety audit guidance only. If you are experiencing a life-threatening disaster emergency, call local crisis dispatch authorities immediately.
              </p>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
}
