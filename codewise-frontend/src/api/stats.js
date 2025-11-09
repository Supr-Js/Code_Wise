// src/api/stats.js
import api from "./http";

/**
 * 백엔드 HistoryController.getUserStats() 연동:
 * GET /user/history/stats  → { topLanguages:[{language,count}], topPurposes:[{purpose,count}], topErrors:[{error,count}] }
 */
export async function getUserStats() {
  const { data } = await api.get("/user/history/stats");
  return data || { topLanguages: [], topPurposes: [], topErrors: [] };
}