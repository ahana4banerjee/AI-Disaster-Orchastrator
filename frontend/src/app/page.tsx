import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#0f172a] via-[#0d121f] to-[#1e1b4b] text-slate-100 flex flex-col justify-between font-sans">
      {/* Navbar */}
      <header className="h-20 border-b border-slate-800/40 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-55">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-linear-to-tr from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-black text-base">Ω</span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider uppercase">
              Disaster Orchestrator
            </h1>
            <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider -mt-0.5">
              Decision Support Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-bold text-slate-300 hover:text-white px-4 py-2 transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white px-5 py-2.5 rounded-xl shadow-md transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <span>⚡ Next Generation emergency response engine</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 max-w-3xl leading-tight">
          AI-Powered{" "}
          <span className="bg-clip-text bg-linear-to-r from-cyan-400 via-sky-400 to-indigo-400">
            Disaster Intelligence
          </span>{" "}
          & Decision Support
        </h2>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
          Orchestrate emergency logistics, run cascading temporal step-by-step simulations, and compile AI-generated situation reports to optimize crisis response.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/login"
            className="px-8 py-4 bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-102 transition cursor-pointer"
          >
            Enter Control Room
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 bg-slate-900/60 border border-slate-800 hover:bg-slate-900/80 hover:border-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
          >
            Create Citizen Profile
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {[
            {
              title: "Time-Step Simulator",
              description: "Model cascading outages, hospital capacities, and logistics constraints over WebSockets.",
              icon: "⚡"
            },
            {
              title: "Analytics compare",
              description: "Examine side-by-side risk matrices, historical severities, and logistical requirements.",
              icon: "⚖️"
            },
            {
              title: "AI Situation Reports",
              description: "Compile critical operational warnings and download sitrep briefs directly as PDF logs.",
              icon: "📋"
            }
          ].map((feat, idx) => (
            <div
              key={idx}
              className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 text-left shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl bg-slate-800/30 h-12 w-12 rounded-xl flex items-center justify-center mb-4">
                  {feat.icon}
                </span>
                <h4 className="text-white font-bold text-base mb-2">{feat.title}</h4>
                <p className="text-slate-450 text-xs leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-slate-850 px-8 flex items-center justify-between text-xs text-slate-500">
        <span>© 2026 Disaster Orchestrator. All rights reserved.</span>
        <span>Secure Core v1.0.0</span>
      </footer>
    </div>
  );
}
