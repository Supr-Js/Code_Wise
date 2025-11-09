// src/utils/http.js
import axios from "axios";

const http = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL, // 예: http://54.180.142.101:8080
  withCredentials: false, // 백엔드가 HttpOnly 쿠키를 쓸 땐 true로 (지금은 JWT 바디라 false)
});

// 요청 인터셉터: 토큰 자동 첨부
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 처리
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("token");
      // 로그인 페이지로 이동 (SPA 안이라면)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default http;
