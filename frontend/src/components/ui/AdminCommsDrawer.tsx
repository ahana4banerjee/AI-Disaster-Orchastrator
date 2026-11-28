"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  MessageSquare,
  Activity,
  Send,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ActivityLogItem {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  action: string;
  targetCollection?: string;
  details: string;
  timestamp: string;
}

interface CommItem {
  id: string;
  adminUserId: string;
  adminEmail: string;
  message: string;
  category: "Handover" | "Directive" | "Alert" | "General";
  relatedEntity?: string | null;
  createdAt: string;
}

interface AdminCommsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AdminCommsDrawer({ open, onClose }: AdminCommsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "comms">("activity");
  const [auditLogs, setAuditLogs] = useState<ActivityLogItem[]>([]);
  const [comms, setComms] = useState<CommItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<"Handover" | "Directive" | "Alert" | "General">("Handover");
  const [message, setMessage] = useState("");
  const [relatedEntity, setRelatedEntity] = useState("");
  const [sending, setSending] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/admin/activity-feed?limit=40", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load EOC activity feed");
      const data = await res.json();
      setAuditLogs(data.auditLogs || []);
      setComms(data.communications || []);
    } catch (err: any) {
      setError(err.message || "Unable to fetch admin activity feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchFeed();
    const interval = setInterval(fetchFeed, 15000);
    return () => clearInterval(interval);
  }, [open, fetchFeed]);

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("http://127.0.0.1:8000/api/v1/admin/communications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          category,
          relatedEntity: relatedEntity.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Failed to post operational note");
      }
      setMessage("");
      setRelatedEntity("");
      await fetchFeed();
    } catch (err: any) {
      setError(err.message || "Error posting operational note.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="w-full max-w-[430px] h-full bg-bg-secondary border-l border-border-custom shadow-xl flex flex-col">
        {/* Header */}
        <div className="h-[72px] px-5 border-b border-border-custom flex items-center justify-between select-none">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent-primary" />
              EOC Admin Activity & Comms
            </h3>
            <p className="text-[10px] text-text-secondary mt-0.5">
              Live cross-admin operations & shift handover feed
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchFeed}
              title="Refresh Feed"
              className="p-1.5 rounded-lg border border-border-custom text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              title="Close Side Portal"
              className="p-1.5 rounded-lg border border-border-custom text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-border-custom bg-bg-primary/40 select-none">
          <button
            onClick={() => setActiveTab("activity")}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "activity"
                ? "border-accent-primary text-accent-primary bg-bg-secondary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            All Operations ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("comms")}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "comms"
                ? "border-accent-primary text-accent-primary bg-bg-secondary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Handover Notes ({comms.length})
          </button>
        </div>

        {error && (
          <div className="m-3 p-2.5 rounded-lg border border-red-500/30 bg-red-500/5 text-[11px] text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Feed Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {loading && auditLogs.length === 0 && comms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Loader2 className="h-5 w-5 text-accent-primary animate-spin" />
              <span className="text-[11px] font-mono text-text-secondary">Syncing EOC feed...</span>
            </div>
          ) : activeTab === "activity" ? (
            auditLogs.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-8">No recent admin operations recorded.</p>
            ) : (
              auditLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl border border-border-custom bg-bg-primary/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${
                        log.action.includes("DELETE")
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : log.action.includes("GENERATE") || log.action.includes("CREATE")
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-[9px] font-mono text-text-muted">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-snug">{log.details}</p>
                  <div className="text-[10px] font-mono text-text-secondary truncate">
                    By: {log.adminEmail || log.adminUserId}
                  </div>
                </div>
              ))
            )
          ) : comms.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-8">
              No handover notes yet. Post a message below to coordinate with other admins.
            </p>
          ) : (
            comms.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-xl border border-border-custom bg-bg-primary/40 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wider ${
                      note.category === "Alert"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : note.category === "Directive"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}
                  >
                    {note.category}
                  </span>
                  <span className="text-[9px] font-mono text-text-muted">
                    {new Date(note.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-text-primary leading-relaxed">{note.message}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                  <span>{note.adminEmail}</span>
                  {note.relatedEntity && <span className="text-accent-primary">{note.relatedEntity}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compose Handover Note */}
        <form onSubmit={handlePostNote} className="p-4 border-t border-border-custom bg-bg-primary/30 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="h-8 px-2 bg-bg-secondary border border-border-custom rounded-lg text-[11px] text-text-primary focus:border-accent-primary focus:outline-hidden"
            >
              <option value="Handover">Handover</option>
              <option value="Directive">Directive</option>
              <option value="Alert">Alert</option>
              <option value="General">General</option>
            </select>
            <input
              type="text"
              maxLength={100}
              value={relatedEntity}
              onChange={(e) => setRelatedEntity(e.target.value)}
              placeholder="Ref ID (optional)"
              className="h-8 px-2.5 bg-bg-secondary border border-border-custom rounded-lg text-[11px] text-text-primary focus:border-accent-primary focus:outline-hidden"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              required
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Post operational note to EOC admins..."
              className="flex-1 h-9 px-3 bg-bg-secondary border border-border-custom rounded-lg text-xs text-text-primary focus:border-accent-primary focus:outline-hidden"
            />
            <Button type="submit" variant="primary" size="sm" disabled={sending} className="h-9 px-3">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
