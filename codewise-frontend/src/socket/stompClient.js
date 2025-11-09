// src/socket/stompClient.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// 백엔드 엔드포인트가 /ws-stomp 로 확정됨
export function buildStompClient(token) {
  const sockUrl =
    process.env.REACT_APP_WS_URL ||
    '/stomp'; // (로컬 개발에서 프록시 쓸 경우만 백업)

  const client = new Client({
    webSocketFactory: () => new SockJS(sockUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });

  return client;
}

export function publishAnalyze(client, payload) {
  if (!client || !client.connected) {
    console.warn('STOMP not connected');
    return;
  }
  client.publish({
    destination: '/app/analyze',
    body: JSON.stringify(payload),
  });
}