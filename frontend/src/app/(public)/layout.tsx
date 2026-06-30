"use client";

import React from "react";
import { PublicNavbar } from "@/components/ui/PublicNavbar";
import { PublicFooter } from "@/components/ui/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-150 font-sans">
      {/* Global Navigation Header */}
      <PublicNavbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>

      {/* Global Brand Footer */}
      <PublicFooter />
    </div>
  );
}
