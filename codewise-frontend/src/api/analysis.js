import api from "./http";

export const analyzeCode = async ({ code, language = "auto" }) => {
  const { data } = await api.post("/api/analyze", { code, language });
  return data;
};
