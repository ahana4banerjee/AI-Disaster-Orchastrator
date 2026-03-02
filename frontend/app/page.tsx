"use client";

import DisasterForm from "@/components/DisasterForm";
import History from "@/components/History";
import AnalyticsChart from "@/components/AnalyticsChart";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-10">
      <h1 className="text-4xl font-bold mb-10">
        AI Disaster Orchestrator Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <DisasterForm />
        </div>

        <div>
  <History />
  <AnalyticsChart />
</div>
      </div>
    </main>
  );
}