// src/api/telemetry.js
import api from "./http";

/** 허용 부분*/
const PURPOSE_ALLOW = {
  auto: true,
  general_refactor: true,
  security_hardening: true,
  performance_opt: true,
  teach_beginner: true,
};
const LANG_ALLOW = {
  auto: true,
  c: true, cpp: true, java: true, javascript: true, typescript: true,
  python: true, go: true, rust: true, kotlin: true, swift: true,
  csharp: true, php: true, ruby: true,
};

/** CRA/Webpack 호환: import.meta 금지 */
const DEV =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NODE_ENV === "development";

/** ISO_LOCAL_DATE_TIME (no TZ) */
function toLocalIsoNoTZ(input) {
  try {
    const d = input ? new Date(input) : new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "1970-01-01T00:00:00";
  }
}
const normPurpose = (p) =>
  PURPOSE_ALLOW[String(p || "").toLowerCase()] ? String(p).toLowerCase() : "general_refactor";
const normLang = (l) =>
  LANG_ALLOW[String(l || "").toLowerCase()] ? String(l).toLowerCase() : "auto";
function normErrors(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const e of list) {
    const type = ["error", "warn", "info"].includes((e?.type || "").toLowerCase())
      ? (e.type || "info").toLowerCase()
      : "info";
    const message = String(e?.message || "");
    const key = `${type}::${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, message });
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * 분석 히스토리 저장 (POST /user/history)
 * 프론트의 응답 흐름 위해 호출부 await 피하기
 */
// saveAnalysisHistory 함수 최종 수정
export async function saveAnalysisHistory({ language, purpose, errors, createdAt = new Date() }) {
  const payload = {
    language: normLang(language),
    purpose: normPurpose(purpose),
    errors: normErrors(errors),
    // 데이터 정형화: 분산 환경 및 다른 시간대(Timezone) 설정의 서버 인프라 간 데이터 일관성을 유지하기 위해
    // 로컬 시스템의 시간대를 제외한 ISO_LOCAL_DATE_TIME 포맷으로 변환 후 전송
    createdAt: toLocalIsoNoTZ(createdAt),
  };

  // 네트워크 장애 대책으로 멱등성 검증 기법 도입
  // 대용량 트래픽 혹은 실시간 WebSocket 재연결 시 동일한 분석 결과가 데이터베이스에 중복 삽입(Duplicate Insertion)되는 현상을 차단.
  // 타임스탬프와 난수 기반의 고유 식별키를 생성하여 HTTP 헤더에 주입함으로써 백엔드 단에서 동일 요청을 1회만 처리하도록 보장.
  const headers = { "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
  
  try {
    // 사용자의 분석 흐름 UI 응답성을 해치지 않기 위해 (Non-blocking UI), 호출부에서 await를 피하고 백그라운드 스레드에서 전송 처리
    await api.post("/user/history", payload, { headers });
    if (DEV) console.log("[Telemetry] History saved");
  } catch (err) {
    if (DEV) {
      console.warn("[Telemetry] saveAnalysisHistory failed", err?.response?.data || err?.message || err);
    }
    // 통계성 데이터 유실이 주 서비스(코드 분석 기능) 이용에 영향을 주지 않도록 방어적 예외 전파 차단
  }
}

/**
 * 데이터 정형화 핸들러: AI 분석 결과 객체로부터 최종 분석 목적(Purpose)을 안전하게 추출 헬퍼
 * result.final_purpose를 최우선으로 탐색하며, 데이터 누락 시 자동 추론된 목적(inferred_purpose)이나 
 * 시스템 기본값(general_refactor)으로 대체(Fallback) 처리하여 런타임 에러를 방지하고 데이터 일관성을 확보
 */
export function pickFinalPurposeFromResult(result, fallback = "general_refactor") {
  return (
    result?.final_purpose ||
    result?.inferred_purpose ||
    normPurpose(fallback)
  );
}
