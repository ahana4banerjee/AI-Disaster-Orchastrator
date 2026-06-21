"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Scenarios Compare", href: "/admin/scenarios", icon: "⚖️" },
    { name: "Simulation Engine", href: "/admin/simulations", icon: "⚡" },
    { name: "Situation Reports", href: "/admin/reports", icon: "📋" },
    { name: "Action Audit Logs", href: "/admin/audit-logs", icon: "🛡️" },
  ];

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-68 bg-[#0d121f] border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 border-b border-slate-800/80 flex items-center px-6 gap-3">
            <div className="h-8 w-8 bg-linear-to-tr from-cyan-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">Ω</span>
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wider text-slate-100 uppercase">
                Disaster
              </h1>
              <p className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase -mt-0.5">
                Orchestrator
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-200 cursor-pointer ${
                    isActive
                      ? "bg-linear-to-r from-cyan-500/10 to-indigo-500/10 text-cyan-400 border-l-2 border-cyan-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account Section */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-200">Admin User</p>
              <p className="text-[10px] text-slate-400">admin@earth.org</p>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-red-950/20 border border-red-900/50 hover:bg-red-950/40 text-red-400 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Dashboard Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Navigation */}
        <header className="h-16 bg-[#0d121f]/50 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-8 z-10">
          <div>
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              Control Panel
            </span>
          </div>

          {/* Indicators Bar */}
          <div className="flex items-center gap-6 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-emerald-400 uppercase tracking-wider text-[10px]">
                Core Status: Online
              </span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#090d16]">
          {children}
        </main>
      </div>
    </div>
  );
}
