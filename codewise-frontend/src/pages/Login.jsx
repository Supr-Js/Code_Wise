// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getGoogleLoginUrl } from "../api/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      const data = await loginUser({ email, password });
      if (!data?.token) {
        setError("로그인 응답에 토큰이 없습니다.");
        return;
      }
      nav("/editor", { replace: true });
    } catch (err) {
      setError(err.message || "로그인 실패");
    }
  };

  const onGoogle = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg,#eaf3ff 0%, #f6fbff 100%)"
    }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 10px 24px rgba(0,0,0,.07)",
          padding: 20
        }}
      >
        <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center", marginBottom:6 }}>
          <img src="/logo-ai.png" alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <div style={{ fontWeight: 800, fontSize: 18 }}>CodeWise</div>
        </div>
        <div style={{ textAlign:"center", fontSize:12, color:"#6b7280", marginBottom:14 }}>AI Code Analysis</div>

        {error && (
          <p style={{ color:"#dc2626", fontSize:12, textAlign:"center", marginBottom:10 }}>{error}</p>
        )}

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          style={{
            width:"100%", boxSizing:"border-box",
            border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 12px", marginBottom:8
          }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width:"100%", boxSizing:"border-box",
            border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 12px", marginBottom:12
          }}
        />

        {/* 로그인 / 회원가입 나란히 (반반) */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button
            type="submit"
            style={{
              width:"100%", background:"#2563eb", color:"#fff",
              border:"none", borderRadius:12, padding:"10px 0", fontWeight:700
            }}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() => nav("/signup")}
            style={{
              width:"100%", background:"#f3f4f6", color:"#111827",
              border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 0", fontWeight:700
            }}
          >
            회원가입
          </button>
        </div>

        {/* Google 버튼 (아래 배치) */}
        <button
          type="button"
          onClick={onGoogle}
          style={{
            width:"100%", marginTop:10,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 0"
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="" style={{ width:18, height:18 }}
          />
          Google 계정으로 로그인하기
        </button>

        <hr style={{ border:"none", borderTop:"1px solid #eee", margin:"14px 0" }} />
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af" }}>
          Single Sign-On은 관리자에게 문의하세요.
        </p>
      </form>
    </div>
  );
}