// src/socket/StompProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildStompClient, publishAnalyze } from "./stompClient";

const StompCtx = createContext(null);

export function StompProvider({ children }) {
  const token = localStorage.getItem("token");
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    // 토큰 기준으로 연결
    const client = buildStompClient(token);

    client.onConnect = () => {
      setConnected(true);

      // 백엔드 스펙: /topic/result 구독
      client.subscribe("/topic/result", (msg) => {
        try {
          const data = JSON.parse(msg.body);
          setLastResult(data);
          console.log("[RESULT]", data);
        } catch (e) {
          console.warn("Bad result payload:", msg.body);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers["message"], frame.body);
    };

    client.onWebSocketClose = () => setConnected(false);

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token]);

  const sendAnalyze = useMemo(
    () => (payload) => publishAnalyze(clientRef.current, payload),
    []
  );

  const value = { client: clientRef.current, connected, lastResult, sendAnalyze };

  return <StompCtx.Provider value={value}>{children}</StompCtx.Provider>;
}

export const useStomp = () => useContext(StompCtx);
