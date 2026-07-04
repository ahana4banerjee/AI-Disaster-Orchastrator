import { useState, useEffect, useRef } from "react";

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export function useSimulationWebSocket(
  simulationId: string | null,
  onMessageReceived?: (msg: WebSocketMessage) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use latest callback ref pattern to prevent connection loops on parent state changes
  const callbackRef = useRef(onMessageReceived);

  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!simulationId) return;

    const connect = () => {
      setError(null);
      const token = localStorage.getItem("token") || "";
      const wsUrl = `ws://127.0.0.1:8000/api/v1/simulations/${simulationId}/ws?token=${encodeURIComponent(token)}`;

      console.log(`[useSimulationWebSocket] Automatically initializing telemetry connection to: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(`[useSimulationWebSocket] Telemetry link connected automatically!`);
        setIsConnected(true);
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "PING" }));
          }
        }, 10000);
        (socket as any)._pingInterval = pingInterval;
      };

      socket.onmessage = (event) => {
        try {
          const payload: WebSocketMessage = JSON.parse(event.data);
          console.log(`[useSimulationWebSocket] Telemetry message received automatically:`, payload);
          if (payload.type === "PONG") {
            return;
          }
          if (callbackRef.current) {
            callbackRef.current(payload);
          }
        } catch {
          // Handle malformed JSON frames silently
        }
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        if ((socket as any)._pingInterval) {
          clearInterval((socket as any)._pingInterval);
        }

        // Reconnect if not closed intentionally or by auth violations
        if (event.code !== 1000 && event.code !== 1008) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3500);
        }
      };

      socket.onerror = () => {
        setError("WebSocket connection failed.");
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        if ((socketRef.current as any)._pingInterval) {
          clearInterval((socketRef.current as any)._pingInterval);
        }
        socketRef.current.close(1000, "Closed by unmount");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [simulationId]);

  return { isConnected, error };
}
