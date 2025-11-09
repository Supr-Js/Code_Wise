// src/socket/StompProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { buildStompClient } from "./stompClient";
import { getUserStats } from "../api/stats";
import { saveAnalysisHistory } from "../api/telemetry";

const StompCtx = createContext(null);

export default function StompProvider({ children }) {
  const token = localStorage.getItem("token") || "";

  const clientRef = useRef(null);
  const subRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const lastReqRef = useRef({ language: "auto", purpose: "auto" });
  const userProfileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stats = await getUserStats();
        if (alive) userProfileRef.current = stats;
      } catch {
        if (alive) userProfileRef.current = null;
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const client = buildStompClient(token);

    client.onConnect = () => {
      setConnected(true);
      if (subRef.current) {
        try { subRef.current.unsubscribe(); } catch {}
      }

      subRef.current = client.subscribe("/user/queue/result", async (msg) => {
        try {
          const data = JSON.parse(msg.body);

          if (process.env.NODE_ENV === "development") {
            const fx = (data && data.fix) || {};
            const L = (s) => (s ? String(s).length : 0);
            console.debug("[WS result] keys=", Object.keys(data || {}));
            console.debug("[WS result] fix.fixed_code len=", L(fx.fixed_code),
                          "top-level fixed_code len=", L(data.fixed_code),
                          "patch len=", L(fx.patch || data.patch));
          }

          setLastResult(data);

          try {
            const lang =
              data?.metrics?.language || lastReqRef.current.language || "auto";

            const finalPurpose =
              data?.final_purpose ||
              (lastReqRef.current.purpose !== "auto"
                ? lastReqRef.current.purpose
                : data?.inferred_purpose || "general_refactor");

            const errors = Array.isArray(data?.issues)
              ? data.issues.map((it) => ({
                  type: it.severity || "info",
                  message: it.message || "",
                }))
              : [];

            // 저장 실패는 UI 차단하지 않음
            saveAnalysisHistory({ language: lang, purpose: finalPurpose, errors });
          } catch (e) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[history] save failed:", e?.response?.data || e);
            }
          }
        } catch (e) {
          console.warn("Bad result payload:", msg.body);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame?.headers?.["message"], frame?.body || "");
      setConnected(false);
    };
    client.onWebSocketClose = () => { setConnected(false); };

    clientRef.current = client;
    client.activate();

    return () => {
      try { subRef.current?.unsubscribe(); } catch {}
      try { client.deactivate(); } catch {}
      subRef.current = null;
      clientRef.current = null;
    };
  }, [token]);

  const sendAnalyze = useCallback((payload) => {
    const c = clientRef.current;
    if (!c) { console.warn("No STOMP client"); return; }
    if (!c.connected) { console.warn("STOMP not connected yet"); return; }

    const lang = payload?.language || "auto";
    const purpose = payload?.purpose || "auto";
    lastReqRef.current = { language: lang, purpose };

    const body = JSON.stringify({ ...payload, user_profile: userProfileRef.current || undefined });
    c.publish({ destination: "/app/analyze", body });
  }, []);

  const value = useMemo(() => ({
    client: clientRef.current,
    connected,
    lastResult,
    sendAnalyze,
  }), [connected, lastResult, sendAnalyze]);

  return <StompCtx.Provider value={value}>{children}</StompCtx.Provider>;
}

export const useStomp = () => useContext(StompCtx);