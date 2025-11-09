export const connectSocket = () => {
  const base = process.env.REACT_APP_WS_URL; // ws://localhost:8080/ws
  const token = localStorage.getItem("token");
  const url = `${base}?token=${encodeURIComponent(token)}`;
  return new WebSocket(url);
};