// src/api/telemetry.js
import api from "./http";

/** 허용 목록 */
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

/** CRA/Webpack 호환: import.meta 사용 금지 */
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
 * 프론트의 응답 흐름을 막지 않도록 호출부에서 await 하지 않는 것을 권장.
 */
export async function saveAnalysisHistory({
  language,
  purpose,
  errors,
  createdAt = new Date(),
}) {
  const payload = {
    language: normLang(language),
    purpose: normPurpose(purpose),
    errors: normErrors(errors),
    createdAt: toLocalIsoNoTZ(createdAt),
  };

  // 멱등 키(선택): 백엔드에서 헤더를 읽어 중복 삽입 방지 가능
  const headers = { "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };

  try {
    await api.post("/user/history", payload, { headers });
    if (DEV) console.log("[Telemetry] History saved");
  } catch (err) {
    if (DEV) {
      console.warn(
        "[Telemetry] saveAnalysisHistory failed",
        err?.response?.data || err?.message || err
      );
    }
    // 실패는 UI 차단 사유가 아님
  }
}

/**
 * Optional convenience helper:
 * Extract a final purpose from an AI result object.
 * Prefers result.final_purpose, falls back to inferred_purpose or provided default.
 */
export function pickFinalPurposeFromResult(result, fallback = "general_refactor") {
  return (
    result?.final_purpose ||
    result?.inferred_purpose ||
    normPurpose(fallback)
  );
}
