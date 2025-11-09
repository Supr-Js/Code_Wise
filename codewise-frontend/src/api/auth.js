// src/api/auth.js
import api from "./http";

export async function loginUser(credentials) {
  try {
    const { data } = await api.post("/auth/login", credentials);
    if (data?.token) localStorage.setItem("token", data.token);
    return data;
  } catch (err) {
    const msg = err?.response?.data?.message || "로그인 실패";
    throw new Error(msg);
  }
}

export async function signupUser(credentials) {
  try {
    const { data } = await api.post("/auth/signup", credentials);
    return data;
  } catch (err) {
    const msg = err?.response?.data?.message || "회원가입 실패";
    throw new Error(msg);
  }
}

export function logoutUser() {
  localStorage.removeItem("token");
}

export async function getMe() {
  const { data } = await api.get("/user/me");
  return data; // { id, email, role }
}

export async function getHistory({ sortBy = "id", direction = "desc" } = {}) {
  const { data } = await api.get(`/user/history`, { params: { sortBy, direction } });
  return data; // [{ submissionId, score, language, createdAt, ...purpose? ...errors? }]
}

export async function deleteMe() {
  const { data } = await api.delete("/user/me");
  return data; // "회원 탈퇴가 완료되었습니다."
}

// Google OAuth 시작 URL (백엔드가 리다이렉트 처리 → /oauth2/redirect?token=.. 로 돌아옴)
export function getGoogleLoginUrl() {
  // 절대 URL을 .env에서 직접 주입 (주석/공백 금지)
  const abs = process.env.REACT_APP_OAUTH_AUTHORIZE_ABS;
  if (abs && /^https?:\/\//.test(abs)) return abs;

  // 백업: BASE + 표준 경로 조합
  const base = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
  return `${base}/oauth2/authorization/google`;
}
