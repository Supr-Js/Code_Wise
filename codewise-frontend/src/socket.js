// src/socket.js (STOMP/SockJS 버전)
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export const createStompClient = () => {
  const token = localStorage.getItem("token");
  const wsUrl = process.env.REACT_APP_WS_URL; // 예: http://54.180.142.101:8080/ws  (SockJS는 http(s)로 시작)

  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    debug: () => {}, // 필요시 로깅
  });

  return client;
};