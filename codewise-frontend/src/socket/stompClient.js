// src/socket/stompClient.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * JWT가 있을 때 Authorization 헤더로 전달
 * - 구독: /topic/result
 * - 발행: /app/analyze
 */
export function buildStompClient(token) {
  const url = process.env.REACT_APP_WS_URL; // http://54.180.142.101:8080/ws

  const client = new Client({
    // SockJS를 사용할 때 brokerURL은 설정하지 않고 webSocketFactory만 설정
    webSocketFactory: () => new SockJS(url),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (msg) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[STOMP]", msg);
      }
    },
  });

  return client;
}

// 분석 요청 발행 헬퍼
export function publishAnalyze(client, payload) {
  if (!client || !client.connected) {
    console.warn("STOMP not connected");
    return;
  }
  client.publish({
    destination: "/app/analyze",
    body: JSON.stringify(payload), // { code, language }
  });
}
