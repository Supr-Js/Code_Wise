import http from "../utils/http";

export const analyzeCode = async ({ code, language = "auto" }) => {
  const res = await http.post("/api/analyze", { code, language });
  return res.data; // { result: ... }
};
