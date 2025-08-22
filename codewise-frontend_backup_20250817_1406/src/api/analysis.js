import http from "./http";

export const analyzeCode = async (payload) => {
  // payload 예: { language: 'js', code: '...' }
  const { data } = await http.post("/analysis", payload);
  return data; // { summary, issues, suggestions... }
};