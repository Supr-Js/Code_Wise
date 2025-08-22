// src/api/auth.js
import api from "./http";

// 로그인
export async function loginUser(credentials) {
  try {
    const { data } = await api.post("/auth/login", credentials); // { email, password }
    if (data?.token) {
      localStorage.setItem("token", data.token);
    }
    return data; // { token, ... }
  } catch (err) {
    // 서버 메시지 (있으면 노출)
    const msg = err?.response?.data?.message || "로그인 실패";
    throw new Error(msg);
  }
}

// 회원가입(필요 시)
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
