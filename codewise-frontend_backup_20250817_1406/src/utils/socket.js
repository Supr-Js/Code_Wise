import { io } from "socket.io-client";
export const socket = io("http://localhost:5000", { autoConnect: false });
// 로그인 성공 후 socket.connect() 호출 예정
