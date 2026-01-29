// src/socket/stompClient.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * 백엔드 STOMP SockJS 엔드포인트는 /ws-stomp 로
 * - Vercel(prod): REACT_APP_WS_URL= https://codewise-backend.duckdns.org/ws-stomp
 * - 로컬(프록시):  /ws-stomp
 */
function resolveSockUrl() {
  const env = process.env.REACT_APP_WS_URL?.trim();
  if (env && /^https?:\/\//i.test(env)) return env;                 // 절대 URL > 그대로
  if (env && env.startsWith('/')) return env;                        // 상대 경로 > 프록시
  // 환경변수 사용 불가능 시 프록시 기본값 이용
  return '/ws-stomp';
}

export function buildStompClient(token) {
  const sockUrl = resolveSockUrl();

  const client = new Client({
    webSocketFactory: () => new SockJS(sockUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 500,            // 빠른 재시도(점진적 백오프는 STOMP 내부가 처리)
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},                // 필요 시 console.debug로 변경
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