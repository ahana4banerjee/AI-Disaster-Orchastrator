"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";

export default function History() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await API.get("/history");
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history", error);
    }
  };

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Previous Predictions</h2>

      <div className="grid gap-4">
       {history.map((item) => {
  const severityColor =
    item.severity_level === "High"
      ? "text-red-500"
      : item.severity_level === "Medium"
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div
      key={item.id}
      className="bg-gray-800 p-4 rounded-xl shadow"
    >
      <p><strong>Type:</strong> {item.disaster_type}</p>

      <p className={`font-semibold ${severityColor}`}>
        Severity: {item.severity_level}
      </p>

      <p>Damage: ₹{item.estimated_damage.toLocaleString()}</p>

      <p>
        A:{item.ambulances} | 
        R:{item.rescue_teams} | 
        C:{item.relief_camps}
      </p>
    </div>
  );
})}
      </div>
    </div>
  );
}