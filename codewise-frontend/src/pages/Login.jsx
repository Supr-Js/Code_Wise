// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1) 클라이언트 검증: 비어있으면 API 호출 X
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      // 2) 서버 호출
      const data = await loginUser({ email, password }); // 200이어야 navigate
      if (!data?.token) {
        setError("로그인 응답에 토큰이 없습니다.");
        return;
      }

      // 3) 성공 시에만 이동
      nav("/editor", { replace: true });
    } catch (err) {
      setError(err.message || "로그인 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="p-6 rounded-lg shadow w-96 bg-white">
        <h2 className="text-xl font-bold mb-4 text-center">로그인</h2>

        {error && (
          <p className="text-red-600 text-sm mb-3 text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="이메일"
          className="border rounded w-full p-2 mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="비밀번호"
          className="border rounded w-full p-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded py-2"
        >
          로그인
        </button>

        {/* 필요 시 구글 버튼은 주석/비활성화 */}
        {/* <button type="button" className="w-full mt-3 border rounded py-2">
          Google 계정으로 로그인
        </button> */}
      </form>
    </div>
  );
}
