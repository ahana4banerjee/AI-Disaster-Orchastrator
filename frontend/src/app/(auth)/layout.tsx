import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border-custom rounded-2xl shadow-xs p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-accent-primary rounded-xl flex items-center justify-center text-white font-bold text-xl select-none">
            Ω
          </div>
          <h2 className="text-text-primary font-bold text-xl tracking-wider uppercase mt-4">
            Disaster Intel
          </h2>
          <p className="text-text-secondary text-[11px] font-semibold tracking-wider uppercase mt-1">
            Emergency Ops Gateway
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
