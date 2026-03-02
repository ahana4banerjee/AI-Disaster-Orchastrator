"use client";

import { useEffect, useState } from "react";
import API from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const response = await API.get("/history");
    const history = response.data;

    const counts: any = { Low: 0, Medium: 0, High: 0 };

    history.forEach((item: any) => {
      counts[item.severity_level]++;
    });

    setData([
      { name: "Low", count: counts.Low },
      { name: "Medium", count: counts.Medium },
      { name: "High", count: counts.High },
    ]);
  };

  return (
    <div className="mt-10 bg-gray-800 p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-4">Severity Distribution</h2>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}