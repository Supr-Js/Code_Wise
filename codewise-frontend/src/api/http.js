// src/api/http.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL, // http://54.180.142.101:8080
  timeout: 10000,
});

// 요청마다 JWT 자동 첨부(있을 때만)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // JSON 전송 명시(혹시 누락 방지)
  if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export default api;
