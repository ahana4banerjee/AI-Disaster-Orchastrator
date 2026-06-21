import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-linear-to-tr from-cyan-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <span className="text-white font-black text-xl">Ω</span>
          </div>
          <h2 className="text-white font-extrabold text-2xl tracking-wide bg-clip-text bg-linear-to-r from-cyan-400 to-indigo-400">
            Disaster Orchestrator
          </h2>
          <p className="text-slate-400 text-xs mt-1">AI-Powered Disaster Intel & Decision Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
