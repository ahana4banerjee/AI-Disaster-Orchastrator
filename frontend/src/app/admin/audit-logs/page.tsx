"use client";

import React, { useState, useEffect } from "react";
import { History, ShieldAlert, CheckCircle, Search } from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface AuditLog {
  id?: string;
  _id?: string;
  adminUserId: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  const mockLogs: AuditLog[] = [
    { adminUserId: "eoc_operator_01", action: "SIMULATION_RUN", details: "Executed Cyclone Odisha Cat 4 simulation run", timestamp: "2026-06-21T23:10:12Z", ip: "10.192.1.44" },
    { adminUserId: "eoc_operator_01", action: "SITREP_COMPILE", details: "Compiled SitRep report for Cyclone Odisha Cat 4", timestamp: "2026-06-21T23:12:00Z", ip: "10.192.1.44" },
    { adminUserId: "sys_admin", action: "CREATE_RECORD", details: "Created disaster record code 2026-0012-IND", timestamp: "2026-06-21T17:50:44Z", ip: "10.192.2.12" },
    { adminUserId: "sys_admin", action: "DELETE_RECORD", details: "Deleted disaster record code 2018-0402-PHL", timestamp: "2026-06-21T15:22:10Z", ip: "10.192.2.12" },
    { adminUserId: "eoc_operator_02", action: "PREDICT_RUN", details: "Executed risk forecasting prediction run in East Africa subregion", timestamp: "2026-06-21T14:40:02Z", ip: "10.192.1.58" }
  ];

  const fetchLogs = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://localhost:8000/api/v1/admin/audit-logs", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setStatusMessage({ text: "Database link active. Streaming system audit logs.", type: "success" });
      } else {
        throw new Error("Failed to fetch");
      }
    } catch (err) {
      setLogs(mockLogs);
      setStatusMessage({ text: "Backend offline. Running offline console audit dataset.", type: "info" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTimestamp = (ts: string) => {
    if (!ts) return "-";
    try {
      return ts.replace("T", " ").replace("Z", "");
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Administrative Audit Logs</h2>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Review trace records of operator modifications, simulation executions, and credentials authorization logs.
          </p>
        </div>
        {statusMessage && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[10px] font-mono font-bold select-none ${
            statusMessage.type === "success" 
              ? "bg-severity-low/10 text-severity-low border-severity-low/20" 
              : "bg-accent-purple/10 text-accent-purple border-accent-purple/20"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {statusMessage.text.toUpperCase()}
          </div>
        )}
      </div>

      {/* Audit Log Table Canvas */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] scrollbar-thin">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="h-[60px] border-b border-border-custom bg-bg-secondary sticky top-0 z-10 select-none">
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary w-48">Timestamp</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary w-36">Administrator ID</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary w-32">Action Code</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Action Scope Details</th>
                  <th className="px-5 text-[10px] font-bold uppercase tracking-wider text-text-secondary w-32">IP Coordinate</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr
                    key={log.id || log._id || index}
                    className="h-[56px] border-b border-border-custom hover:bg-bg-primary/40 transition duration-100 text-xs text-text-primary font-medium"
                  >
                    <td className="px-5 font-mono text-text-secondary">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-5 font-mono text-text-primary">{log.adminUserId}</td>
                    <td className="px-5">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                        log.action.includes("DELETE") || log.action.includes("FAILURE")
                          ? "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20"
                          : log.action.includes("CREATE") || log.action.includes("COMPILE")
                          ? "bg-severity-low/10 text-severity-low border-severity-low/20"
                          : "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 text-text-secondary">{log.details}</td>
                    <td className="px-5 font-mono text-text-muted">{log.ip || "10.192.1.1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
