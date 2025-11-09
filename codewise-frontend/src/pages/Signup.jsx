// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../api/auth";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (!email || !password) {
      setErr("이메일/비밀번호를 입력하세요.");
      return;
    }
    try {
      await signupUser({ email, password });
      setMsg("회원가입 성공! 로그인 페이지로 이동합니다.");
      setTimeout(() => nav("/login", { replace: true }), 800);
    } catch (e2) {
      setErr(e2.message || "회원가입 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="p-6 rounded-lg shadow w-96 bg-white">
        <div className="flex items-center gap-2 justify-center mb-3">
          <img src="/logo-ai.png" alt="logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <h2 className="text-xl font-bold">회원가입</h2>
        </div>

        {err && <p className="text-red-600 text-sm mb-3 text-center">{err}</p>}
        {msg && <p className="text-green-600 text-sm mb-3 text-center">{msg}</p>}

        <input
          type="email" placeholder="이메일" className="border rounded w-full p-2 mb-2"
          value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
        />
        <input
          type="password" placeholder="비밀번호" className="border rounded w-full p-2 mb-3"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">가입하기</button>

        <div className="mt-3 text-center">
          <Link to="/login" className="text-blue-600 text-sm">로그인으로 돌아가기</Link>
        </div>
      </form>
    </div>
  );
}