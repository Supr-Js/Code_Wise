import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 구글 버튼 쓰면
import App from "./App";
import "./index.css";
import { StompProvider } from "./socket/StompProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    {/* 구글 로그인 버튼을 쓴다면 clientId 필요 (백엔드 OAuth 리다이렉트만 쓸 거면 없어도 됨) */}
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ""}>
      <StompProvider>
        <App />
      </StompProvider>
    </GoogleOAuthProvider>
  </BrowserRouter>
);
