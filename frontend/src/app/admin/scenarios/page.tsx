"use client";

import React from "react";

export default function ScenariosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">
          Scenario Config Compare
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Create, save, and evaluate side-by-side hypothetical disaster templates.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-4xl mb-4">⚖️</div>
        <h3 className="text-white font-bold text-lg mb-1">Scenario Comparison Engine</h3>
        <p className="text-sm max-w-sm mb-6">
          Construct custom threat scenarios (disaster type, region, magnitude) and run simulations to compare expected casualties, structural losses, and ambulance requirements.
        </p>
        <button className="px-6 py-3 bg-linear-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/10 transition cursor-pointer">
          Create Scenario Config
        </button>
      </div>
    </div>
  );
}
