"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  BarChart3,
  Database,
  Brain,
  Search,
  ShieldAlert,
  Compass,
  Truck,
  Layers,
  Activity,
  FileText,
  History,
  Settings,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [authorized, setAuthorized] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState("eoc@agency.gov");

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");

    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const user = await res.json();
          if (user.role === "admin") {
            setAuthorized(true);
            if (user.email) setUserEmail(user.email);
          } else {
            throw new Error("Forbidden role");
          }
        } else {
          throw new Error("Invalid credentials");
        }
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        router.replace("/login");
      }
    };

    verifyToken();
  }, [router]);

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Records", href: "/admin/records", icon: Database },
    { name: "Predictor", href: "/admin/predictor", icon: Brain },
    { name: "Similarity Search", href: "/admin/similarity", icon: Search },
    { name: "Risk Intelligence", href: "/admin/risk-intelligence", icon: ShieldAlert },
    { name: "Cross-Border", href: "/admin/cross-border", icon: Compass },
    { name: "Resources", href: "/admin/resources", icon: Truck },
    { name: "Scenarios", href: "/admin/scenarios", icon: Layers },
    { name: "Simulation Center", href: "/admin/simulation", icon: Activity },
    { name: "Reports", href: "/admin/reports", icon: FileText },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    router.replace("/login");
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center font-sans">
        <div className="text-xs font-mono text-text-secondary uppercase">
          Verifying security clearance level...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex font-sans transition-colors duration-150">
      {/* Sidebar Navigation */}
      <aside className="w-[280px] bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {/* Logo Brand Header */}
          <div className="h-[72px] border-b border-slate-800 flex items-center px-6 gap-3">
            <div className="h-9 w-9 bg-accent-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              Ω
            </div>
            <div>
              <h1 className="font-bold text-xs tracking-wider text-slate-100 uppercase">
                Disaster Intel
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase -mt-0.5">
                Decision Support
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
                    isActive
                      ? "bg-accent-primary text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-slate-200">EOC Operator</p>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={userEmail}>
                {userEmail}
              </p>
            </div>
            <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-sm border border-red-500/30 uppercase tracking-wider">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-950/20 border border-red-900 hover:bg-red-950/40 text-red-400 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Dashboard Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Navigation */}
        <header className="h-[72px] bg-bg-secondary border-b border-border-custom flex items-center justify-between px-8 z-10 select-none">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">
              Control Room
            </span>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary text-xs font-bold capitalize">
              {pathname.split("/").pop()}
            </span>
          </div>

          {/* Indicators & Theme Toggle */}
          <div className="flex items-center gap-6">
            {/* Server Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-severity-low rounded-full animate-pulse"></span>
              <span className="text-severity-low font-bold uppercase tracking-wider text-[10px] font-mono">
                System Status: Active
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border-custom bg-bg-primary transition cursor-pointer"
              title="Toggle Theme Mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
