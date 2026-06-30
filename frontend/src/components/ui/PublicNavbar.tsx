"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Compass,
  Home,
  ShieldAlert,
  BookOpen,
  UserCheck,
  ClipboardList,
  BarChart,
  MessageSquare,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  LogIn,
} from "lucide-react";

export function PublicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    setIsLoggedIn(!!token);
    setUserEmail(email);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
    setUserEmail(null);
    window.location.href = "/login";
  };

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Risk Checker", href: "/risk-checker", icon: ShieldAlert },
    { name: "Explorer", href: "/disaster-explorer", icon: Compass },
    { name: "Preparedness", href: "/preparedness", icon: ClipboardList },
    { name: "Readiness Quiz", href: "/readiness", icon: UserCheck },
    { name: "Family Planner", href: "/family-planner", icon: ClipboardList },
    { name: "Awareness Hub", href: "/awareness", icon: BookOpen },
    { name: "Insights", href: "/insights", icon: BarChart },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-bg-secondary border-b border-border-custom text-text-primary select-none transition-colors duration-150">
      <div className="max-w-[1600px] mx-auto px-6 h-[72px] flex items-center justify-between">
        
        {/* Brand/Logo Section */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 bg-accent-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
            Ω
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wider uppercase text-text-primary">
              Disaster Intel
            </h1>
            <p className="text-[10px] text-text-muted font-semibold tracking-wider uppercase -mt-0.5">
              Citizen Portal
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition duration-150 ${
                  isActive
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Action Controls & Theme Toggle */}
        <div className="hidden xl:flex items-center gap-4">
          {/* Server Connection Status */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="h-1.5 w-1.5 bg-severity-low rounded-full animate-pulse"></span>
            <span className="text-severity-low font-bold uppercase tracking-wider text-[9px] font-mono">
              System Active
            </span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border-custom bg-bg-primary transition cursor-pointer"
            title="Toggle Theme Mode"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Authentication Actions */}
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-text-muted font-mono truncate max-w-[120px]" title={userEmail || ""}>
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 py-2 px-3 bg-red-950/10 border border-red-900/30 hover:bg-red-950/20 text-red-500 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 py-2 px-3 hover:bg-bg-primary text-text-primary text-xs font-bold rounded-lg transition duration-150"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 py-2 px-3 bg-accent-primary hover:bg-accent-secondary text-white text-xs font-bold rounded-lg transition duration-150"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Control Button */}
        <div className="flex xl:hidden items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border-custom bg-bg-primary transition cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border-custom bg-bg-primary transition cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Slide Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-bg-secondary border-t border-border-custom p-4 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 ${
                    isActive
                      ? "bg-accent-primary text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-primary"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border-custom flex flex-col gap-2">
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] text-text-muted font-mono px-4">
                  Signed in as: {userEmail}
                </span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-950/10 border border-red-900/30 hover:bg-red-950/20 text-red-500 text-xs font-bold rounded-lg transition duration-150 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 hover:bg-bg-primary text-text-primary text-xs font-bold rounded-lg border border-border-custom transition duration-150"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-accent-primary hover:bg-accent-secondary text-white text-xs font-bold rounded-lg transition duration-150"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
