// src/socket.js (STOMP/SockJS)
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export const createStompClient = () => {
  const token = localStorage.getItem("token");
  const wsUrl = process.env.REACT_APP_WS_URL;

  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    debug: () => {}, // 필요시 로깅
  });

  return client;
};