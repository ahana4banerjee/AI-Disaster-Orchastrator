"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Flame, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSimulationWebSocket } from "@/hooks/useSimulationWebSocket";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "warning" | "danger" | "success";
}

interface InfraState {
  name: string;
  status: string;
  color: string;
  details: string;
}

function SimulationPageContent() {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [logQueue, setLogQueue] = useState<LogEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "00:00", message: "SYSTEM CORE INITIALIZED: Listening on telemetry WebSocket...", type: "info" },
    { time: "00:00", message: "READY: Select simulation step parameters to initialize.", type: "success" }
  ]);

  const [simId, setSimId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Created");
  const [simName, setSimName] = useState<string>("Simulation Exercise");

  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  // Stream logs sequentially to EOC console panel
  useEffect(() => {
    if (logQueue.length === 0) return;

    const intervalTime = Math.max(250, 1500 / speedMultiplier);
    const timer = setTimeout(() => {
      const nextLog = logQueue[0];
      setLogs(prev => [...prev, nextLog]);
      setLogQueue(prev => prev.slice(1));
    }, intervalTime);

    return () => clearTimeout(timer);
  }, [logQueue, speedMultiplier]);

  const queueLogs = (newLogs: LogEntry[]) => {
    setLogQueue(prev => [...prev, ...newLogs]);
  };

  const refreshSimulationData = async () => {
    if (!idParam) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://127.0.0.1:8000/api/v1/simulations/${idParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSimName(data.name);
        setStatus(data.status);
        if (data.status === "Running") {
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      }
    } catch {
      // offline fallback
    }
  };

  const { isConnected } = useSimulationWebSocket(simId, (msg) => {
    queueLogs([
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: `[TELEMETRY STREAM]: Broadcast event received: ${msg.type}`,
        type: msg.type === "ERROR" ? "danger" : "info"
      }
    ]);
    if (msg.type === "TIMESTEP_UPDATE" && msg.data) {
      const stepIdx = msg.data.step;
      const hoursMap = [0, 6, 12, 24, 48];
      const targetHour = hoursMap[stepIdx] || 0;
      setCurrentHour(targetHour);
      setActiveStepData(msg.data);
      queueLogs(getStepLogs(targetHour));
    }
    refreshSimulationData();
  });

  const triggerProgress = async () => {
    if (!simId) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://127.0.0.1:8000/api/v1/simulations/${simId}/progress`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (res.ok) {
        const updatedSim = await res.json();
        const nextStepIdx = updatedSim.currentStep;
        const hoursMap = [0, 6, 12, 24, 48];
        const targetHour = hoursMap[nextStepIdx] || 0;
        
        setCurrentHour(targetHour);
        setStatus(updatedSim.status);
        
        const latestStepData = updatedSim.timesteps?.find((t: any) => t.step === nextStepIdx);
        if (latestStepData) {
          setActiveStepData(latestStepData);
          queueLogs(getStepLogs(targetHour));
        }
      } else {
        setIsPlaying(false);
      }
    } catch {
      // Offline preview fallback sequence
      const currentIndex = hours.indexOf(currentHour);
      if (currentIndex < hours.length - 1) {
        const nextHour = hours[currentIndex + 1];
        setCurrentHour(nextHour);
        queueLogs(getStepLogs(nextHour));
        
        const stepIdx = nextHour === 0 ? 0 : nextHour === 6 ? 1 : nextHour === 12 ? 2 : nextHour === 24 ? 3 : 4;
        setActiveStepData({
          step: stepIdx,
          metrics: {
            activeCasualties: nextHour === 0 ? 12 : nextHour === 6 ? 24 : nextHour === 12 ? 45 : nextHour === 24 ? 120 : 180,
            displacedPopulation: nextHour === 0 ? 450 : nextHour === 6 ? 1200 : nextHour === 12 ? 3500 : nextHour === 24 ? 14000 : 25000,
            structuralDamagePercentage: nextHour === 0 ? 1.5 : nextHour === 6 ? 12.0 : nextHour === 12 ? 34.5 : nextHour === 24 ? 65.0 : 85.0
          }
        });
      } else {
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    if (idParam) {
      setSimId(idParam);
      const fetchSimDetails = async () => {
        try {
          const token = localStorage.getItem("token") || "";
          const res = await fetch(`http://127.0.0.1:8000/api/v1/simulations/${idParam}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setSimName(data.name);
            setStatus(data.status);
            
            const latestStepIdx = data.currentStep ?? 0;
            const hoursMap = [0, 6, 12, 24, 48];
            const targetHour = hoursMap[latestStepIdx] || 0;
            setCurrentHour(targetHour);
            
            const latestStepData = data.timesteps?.find((t: any) => t.step === latestStepIdx);
            if (latestStepData) {
              setActiveStepData(latestStepData);
            }
            
            if (data.status === "Running") {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }

            setLogs(prev => [
              ...prev,
              { time: "SYSTEM", message: `LOADED: Cloned simulation run configuration [${data.name}].`, type: "success" }
            ]);
          }
        } catch {
          // offline fallback
          setStatus("Initialized");
          setSimName("Cyclone Odisha Active Exercise");
        }
      };
      fetchSimDetails();
    }
  }, [idParam]);

  const handleStateAction = async (action: "start" | "pause" | "resume" | "cancel") => {
    if (!simId) return;

    if (action === "cancel") {
      const confirm = window.confirm("Are you sure you want to terminate this active simulation? This action is irreversible.");
      if (!confirm) return;
    }

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`http://127.0.0.1:8000/api/v1/simulations/${simId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "Running") {
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
        setLogs(prev => [
          ...prev,
          { time: "SYSTEM", message: `ACTION TRIGGERED: State transitioned to ${data.status}`, type: "success" }
        ]);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || `Failed to transition state via ${action}`);
      }
    } catch {
      let targetStatus = "Running";
      if (action === "pause") targetStatus = "Paused";
      if (action === "resume") targetStatus = "Running";
      if (action === "cancel") targetStatus = "Cancelled";
      if (action === "start") targetStatus = "Running";

      setStatus(targetStatus);
      setLogs(prev => [
        ...prev,
        { time: "SYSTEM (offline)", message: `ACTION TRIGGERED: State changed to ${targetStatus}`, type: "success" }
      ]);
    }
  };
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const hours = [0, 6, 12, 24, 48];

  const initialInfra: Record<number, InfraState[]> = {
    0: [
      { name: "Power Grid", status: "Operational", color: "emerald", details: "Main distribution normal (100% capacity)" },
      { name: "Road Network", status: "Operational", color: "emerald", details: "All highway arteries open" },
      { name: "Hospitals", status: "Operational", color: "emerald", details: "Bed capacity: 42% occupied" },
      { name: "Water Supply", status: "Operational", color: "emerald", details: "Reservoirs operating at baseline" },
      { name: "Telecommunications", status: "Operational", color: "emerald", details: "LTE / SatCom repeaters operational" },
      { name: "Fuel Supply", status: "Operational", color: "emerald", details: "Strategic reserves at 100%" }
    ],
    6: [
      { name: "Power Grid", status: "Operational", color: "emerald", details: "Main distribution normal (100% capacity)" },
      { name: "Road Network", status: "Degraded", color: "amber", details: "Water logging on Route 16; speeds capped at 30km/h" },
      { name: "Hospitals", status: "Operational", color: "emerald", details: "Bed capacity: 55% occupied (Triage warning)" },
      { name: "Water Supply", status: "Operational", color: "emerald", details: "Reservoirs operating at baseline" },
      { name: "Telecommunications", status: "Operational", color: "emerald", details: "LTE / SatCom repeaters operational" },
      { name: "Fuel Supply", status: "Operational", color: "emerald", details: "Strategic reserves at 100%" }
    ],
    12: [
      { name: "Power Grid", status: "Degraded", color: "amber", details: "Substation Delta flooded; load balancing active" },
      { name: "Road Network", status: "Degraded", color: "amber", details: "Route 16 blocked; detours active" },
      { name: "Hospitals", status: "Degraded", color: "amber", details: "Bed capacity: 82% occupied; emergency triage active" },
      { name: "Water Supply", status: "Operational", color: "emerald", details: "Reservoirs operating at baseline" },
      { name: "Telecommunications", status: "Degraded", color: "amber", details: "LTE Node 4 inactive due to grid brownout" },
      { name: "Fuel Supply", status: "Operational", color: "emerald", details: "Strategic reserves at 95%" }
    ],
    24: [
      { name: "Power Grid", status: "Failed", color: "extreme", details: "Grid collapse in Sector 3; backup generator engaged" },
      { name: "Road Network", status: "Failed", color: "extreme", details: "Bridges closed; emergency transport units only" },
      { name: "Hospitals", status: "Failed", color: "extreme", details: "Capacity 100% exceeded; field clinic requests dispatched" },
      { name: "Water Supply", status: "Degraded", color: "amber", details: "Pumping systems running on emergency batteries" },
      { name: "Telecommunications", status: "Failed", color: "extreme", details: "SatCom backhaul offline in Sector 3" },
      { name: "Fuel Supply", status: "Degraded", color: "amber", details: "Distribution pipelines halted" }
    ],
    48: [
      { name: "Power Grid", status: "Failed", color: "extreme", details: "Total blackout in Sector 3 & 4" },
      { name: "Road Network", status: "Failed", color: "extreme", details: "Debris blocking secondary lines; recovery active" },
      { name: "Hospitals", status: "Failed", color: "extreme", details: "Critical failures reported in ICU backup cooling" },
      { name: "Water Supply", status: "Failed", color: "extreme", details: "Pumping stations failed; emergency water trucks routed" },
      { name: "Telecommunications", status: "Failed", color: "extreme", details: "SatCom backhaul offline" },
      { name: "Fuel Supply", status: "Failed", color: "extreme", details: "Strategic reserve supply depots empty" }
    ]
  };

  const getStepLogs = (hour: number): LogEntry[] => {
    switch (hour) {
      case 0:
        return [
          { time: "00:00", message: "SIMULATION CONTEXT ARMED: Meteorological model parameters compiled.", type: "info" },
          { time: "00:02", message: "INFRASTRUCTURE REVIEW: All municipal support structures reported green.", type: "success" }
        ];
      case 6:
        return [
          { time: "06:00", message: "STEP COMPILATION INITIATED: Chronological simulation hour 6.", type: "info" },
          { time: "06:14", message: "METEOROLOGICAL TELEMETRY: Precipitation levels exceeds 120mm/hr.", type: "warning" },
          { time: "06:22", message: "ROAD TELEMETRY: Route 16 report: Water logging detected.", type: "warning" }
        ];
      case 12:
        return [
          { time: "12:00", message: "STEP COMPILATION INITIATED: Chronological simulation hour 12.", type: "info" },
          { time: "12:05", message: "GRID ALARM: Substation Delta brownout reported.", type: "warning" },
          { time: "12:15", message: "HEALTH METRICS ALERT: Hospital beds overflow threshold triggered (82% capacity).", type: "warning" },
          { time: "12:30", message: "AMBULANCE DEFICIT: High demand in Eastern Sectors reported.", type: "danger" }
        ];
      case 24:
        return [
          { time: "24:00", message: "STEP COMPILATION INITIATED: Chronological simulation hour 24.", type: "info" },
          { time: "24:04", message: "POWER DISRUPTION: Grid sector 3 offline. Outage cascaded.", type: "danger" },
          { time: "24:12", message: "TRANSPORT FAILURE: Key bridges shut down. Emergency routing only.", type: "danger" },
          { time: "24:45", message: "TELECOM ANOMALY: LTE Tower backhaul failed in Sector 3.", type: "danger" }
        ];
      case 48:
        return [
          { time: "48:00", message: "STEP COMPILATION INITIATED: Chronological simulation hour 48.", type: "info" },
          { time: "48:10", message: "SYSTEM TIMEOUT: ICU Backup cooling failure logged.", type: "danger" },
          { time: "48:22", message: "CRITICAL FAILURE: Municipal pumping system shut down.", type: "danger" },
          { time: "48:59", message: "CASCADE SEQUENCE COMPLETE: Deficit assessment finalized.", type: "success" }
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const stepDuration = Math.max(500, 10000 / speedMultiplier);
      timer = setInterval(() => {
        if (simId && status === "Running") {
          triggerProgress();
        } else {
          // Offline fallback
          const currentIndex = hours.indexOf(currentHour);
          if (currentIndex < hours.length - 1) {
            const nextHour = hours[currentIndex + 1];
            setCurrentHour(nextHour);
            queueLogs(getStepLogs(nextHour));
            
            const stepIdx = nextHour === 0 ? 0 : nextHour === 6 ? 1 : nextHour === 12 ? 2 : nextHour === 24 ? 3 : 4;
            setActiveStepData({
              step: stepIdx,
              metrics: {
                activeCasualties: nextHour === 0 ? 12 : nextHour === 6 ? 24 : nextHour === 12 ? 45 : nextHour === 24 ? 120 : 180,
                displacedPopulation: nextHour === 0 ? 450 : nextHour === 6 ? 1200 : nextHour === 12 ? 3500 : nextHour === 24 ? 14000 : 25000,
                structuralDamagePercentage: nextHour === 0 ? 1.5 : nextHour === 6 ? 12.0 : nextHour === 12 ? 34.5 : nextHour === 24 ? 65.0 : 85.0
              }
            });
          } else {
            setIsPlaying(false);
          }
        }
      }, stepDuration);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentHour, simId, status, speedMultiplier]);

  const [activeStepData, setActiveStepData] = useState<any>(null);

  const handleStep = async (hour: number) => {
    setCurrentHour(hour);
    const newLogs = getStepLogs(hour);
    setLogs(prev => [
      ...prev,
      ...newLogs
    ]);

    if (simId) {
      const stepIdx = hour === 0 ? 0 : hour === 6 ? 1 : hour === 12 ? 2 : hour === 24 ? 3 : 4;
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`http://127.0.0.1:8000/api/v1/simulations/${simId}/steps/${stepIdx}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveStepData(data);
        } else {
          setActiveStepData(null);
        }
      } catch {
        // Offline preview mock fallback
        setActiveStepData({
          step: stepIdx,
          metrics: {
            activeCasualties: hour === 0 ? 12 : hour === 6 ? 24 : hour === 12 ? 45 : hour === 24 ? 120 : 180,
            displacedPopulation: hour === 0 ? 450 : hour === 6 ? 1200 : hour === 12 ? 3500 : hour === 24 ? 14000 : 25000,
            structuralDamagePercentage: hour === 0 ? 1.5 : hour === 6 ? 12.0 : hour === 12 ? 34.5 : hour === 24 ? 65.0 : 85.0
          }
        });
      }
    } else {
      setActiveStepData(null);
    }
  };

  const handleReset = () => {
    setCurrentHour(0);
    setIsPlaying(false);
    setActiveStepData(null);
    setLogs([
      { time: "00:00", message: "SYSTEM CORE RESET: Restored initial coordinates.", type: "info" },
      { time: "00:00", message: "READY: Select simulation step parameters to initialize.", type: "success" }
    ]);
  };

  const activeInfra = (simId && activeStepData?.infrastructureStates)
    ? activeStepData.infrastructureStates
    : (initialInfra[currentHour] || initialInfra[0]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              {simId ? simName : "Simulation Progression Engine"}
            </h2>
            {simId && (
              <span className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                status === "Running" 
                  ? "bg-severity-low/10 text-severity-low border-severity-low/20" 
                  : status === "Paused" 
                  ? "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20" 
                  : status === "Completed"
                  ? "bg-severity-low/10 text-severity-low border-severity-low/20"
                  : "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20"
              }`}>
                {status}
              </span>
            )}
            {simId && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                isConnected 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                {isConnected ? "Live telemetry" : "Connecting..."}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Asynchronous temporal cascading steps, infrastructure outages, and logistical recommendations.
          </p>
        </div>
        <Link href="/admin/simulation/new">
          <Button variant="primary" className="h-9 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            New Simulation Run
          </Button>
        </Link>
      </div>

      {/* Main Grid: Controls & Timeline (Left/Center) + Infra (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulation Controls & Timeline Player */}
        <div className="lg:col-span-2 bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Control Interface</span>
            <div className="flex items-center gap-2">
              {(status === "Running" || status === "Paused") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-mono border-border-custom hover:bg-bg-primary/50 text-text-secondary hover:text-text-primary transition duration-200"
                  onClick={() => setSpeedMultiplier(prev => prev === 1 ? 2 : prev === 2 ? 5 : prev === 5 ? 10 : 1)}
                >
                  Speed: {speedMultiplier}x
                </Button>
              )}
              {simId ? (
                <>
                  {(status === "Created" || status === "Initialized") && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-1.5 animate-pulse"
                      onClick={() => handleStateAction("start")}
                    >
                      <Play className="h-3.5 w-3.5" /> Start Simulation
                    </Button>
                  )}
                  {status === "Running" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={() => handleStateAction("pause")}
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause Exercise
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-severity-extreme/30 text-severity-extreme hover:bg-severity-extreme/5"
                        onClick={() => handleStateAction("cancel")}
                      >
                        Terminate
                      </Button>
                    </>
                  )}
                  {status === "Paused" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={() => handleStateAction("resume")}
                      >
                        <Play className="h-3.5 w-3.5" /> Resume Exercise
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-severity-extreme/30 text-severity-extreme hover:bg-severity-extreme/5"
                        onClick={() => handleStateAction("cancel")}
                      >
                        Terminate
                      </Button>
                    </>
                  )}
                  {(status === "Completed" || status === "Cancelled" || status === "Failed") && (
                    <span className="text-[10px] text-text-secondary italic uppercase tracking-wider font-bold">
                      Exercise Terminal ({status})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant={isPlaying ? "outline" : "primary"}
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPlaying ? "Pause Stream" : "Run Cascade"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Timeline Visual Display */}
          <div className="py-8 px-4 flex items-center justify-between relative select-none">
            {/* Timeline connectors */}
            <div className="absolute left-10 right-10 h-0.5 bg-border-custom -mt-3.5"></div>
            <div 
              className="absolute left-10 h-0.5 bg-accent-primary transition-all duration-300 -mt-3.5"
              style={{
                width: `${
                  currentHour === 0 ? "0%" :
                  currentHour === 6 ? "25%" :
                  currentHour === 12 ? "50%" :
                  currentHour === 24 ? "75%" : "100%"
                }`
              }}
            ></div>

            {hours.map((h, i) => {
              const isActive = currentHour >= h;
              const isCurrent = currentHour === h;
              return (
                <button
                  key={h}
                  onClick={() => {
                    setIsPlaying(false);
                    handleStep(h);
                  }}
                  className="flex flex-col items-center z-10 focus:outline-hidden group cursor-pointer"
                >
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold font-mono transition duration-300 ${
                    isCurrent 
                      ? "bg-accent-primary border-accent-primary text-white scale-110 shadow-xs" 
                      : isActive 
                      ? "bg-bg-secondary border-accent-primary text-accent-primary" 
                      : "bg-bg-secondary border-border-custom text-text-muted hover:border-text-secondary"
                  }`}>
                    {h}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mt-2 transition duration-300 ${
                    isCurrent ? "text-accent-primary" : "text-text-secondary"
                  }`}>
                    Hour {h}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-bg-primary/40 border border-border-custom rounded-xl p-4 flex items-center gap-3">
            <Cpu className="h-5 w-5 text-accent-secondary" />
            <div className="text-xs">
              <span className="font-bold text-text-primary">Current Execution Step: </span>
              <span className="font-mono text-accent-secondary font-semibold uppercase">Temporal Hour {currentHour}</span>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Cascade multiplier: {(1.0 + currentHour * 0.05).toFixed(2)}x baseline municipal consumption capacity.
              </p>
            </div>
          </div>

          {simId && (
            <div className="grid grid-cols-3 gap-4 border-t border-border-custom pt-4 select-none">
              <div className="p-3 bg-bg-primary/50 border border-border-custom rounded-xl space-y-1">
                <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-sans font-bold">Active Casualties</span>
                <span className="text-base font-bold font-mono text-severity-extreme">
                  {activeStepData?.metrics?.activeCasualties ?? "—"}
                </span>
              </div>
              <div className="p-3 bg-bg-primary/50 border border-border-custom rounded-xl space-y-1">
                <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-sans font-bold">Displaced Pop.</span>
                <span className="text-base font-bold font-mono text-accent-secondary">
                  {activeStepData?.metrics?.displacedPopulation !== undefined 
                    ? activeStepData.metrics.displacedPopulation.toLocaleString() 
                    : "—"}
                </span>
              </div>
              <div className="p-3 bg-bg-primary/50 border border-border-custom rounded-xl space-y-1">
                <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-sans font-bold">Structural Damage</span>
                <span className="text-base font-bold font-mono text-accent-teal">
                  {activeStepData?.metrics?.structuralDamagePercentage !== undefined 
                    ? `${activeStepData.metrics.structuralDamagePercentage.toFixed(1)}%` 
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Infrastructure Status Grid (Right) */}
        <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-border-custom pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Infrastructure Status Monitoring</h3>
            <p className="text-[9px] text-text-secondary mt-0.5">Real-time status of critical systems within disaster perimeter.</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
            {activeInfra.map((infra: InfraState, idx: number) => (
              <div 
                key={idx}
                className="bg-bg-primary/40 border border-border-custom rounded-xl p-3 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-text-primary">{infra.name}</span>
                  <p className="text-[9px] text-text-secondary">{infra.details}</p>
                </div>
                <span className={`inline-flex items-center justify-center px-2 py-0.5 border text-[9px] font-bold rounded-sm tracking-wider uppercase ${
                  infra.color === "emerald" 
                    ? "bg-severity-low/10 text-severity-low border-severity-low/20" 
                    : infra.color === "amber" 
                    ? "bg-severity-moderate/10 text-severity-moderate border-severity-moderate/20" 
                    : "bg-severity-extreme/10 text-severity-extreme border-severity-extreme/20"
                }`}>
                  {infra.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Live Feed Feed (Section 17) */}
      <div className="bg-bg-secondary border border-border-custom rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border-custom pb-3 select-none">
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Terminal Console Stream</span>
          <span className="text-[10px] text-text-secondary font-mono">STDOUT Telemetry feed</span>
        </div>
        <div className="bg-[#020617] rounded-xl p-4 border border-border-custom font-mono text-xs h-[180px] overflow-y-auto scrollbar-thin space-y-1.5 text-slate-350">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-3">
              <span className="text-text-muted text-[10px] select-none">[{log.time}]</span>
              <span className={`flex-1 ${
                log.type === "danger" 
                  ? "text-severity-extreme" 
                  : log.type === "warning" 
                  ? "text-severity-moderate" 
                  : log.type === "success" 
                  ? "text-severity-low" 
                  : "text-slate-300"
              }`}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
        <span className="text-xs text-text-secondary font-mono">Loading simulation telemetry console...</span>
      </div>
    }>
      <SimulationPageContent />
    </Suspense>
  );
}

import { Loader2 } from "lucide-react";
