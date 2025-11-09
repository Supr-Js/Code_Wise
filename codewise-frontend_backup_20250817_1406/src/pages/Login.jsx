import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleMockLogin = (e) => {
    e.preventDefault();
    const fake = 'header.payload.signature';
    localStorage.setItem('token', fake);
    nav('/editor');
  };

  const handleGoogleSuccess = (credResp) => {
    // Google 발급 ID 토큰(JWT)
    const idToken = credResp?.credential;
    if (!idToken) return;

    // (선택) 이메일/이름을 화면에 쓰고 싶다면 decode
    try {
      const payload = jwtDecode(idToken);
      console.log('Google user:', payload); // email, name 등
    } catch {}

    localStorage.setItem('token', idToken); // 우리 앱의 인증 토큰으로 사용
    nav('/editor');
  };

  const handleGoogleError = () => {
    alert('구글 로그인 실패');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-emerald-50">
      <div className="bg-white w-[360px] rounded-2xl shadow-xl p-6">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/logo-ai.png"        // public 폴더에 있는 파일이면 이렇게 절대경로
            alt="CodeWise"
            className="mx-auto mb-3 h-14 w-auto object-contain"   // ← 핵심: h-14 + w-auto
            width={56}   // 선택(권장): CLS 방지용 고정 메타
            height={56}
          />
          <h1 className="text-2xl font-extrabold text-sky-800">CodeWise</h1>
        </div>

        <form onSubmit={handleMockLogin} className="mt-6 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
          <button className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-lg py-2">
            로그인
          </button>
        </form>

        <div className="my-4 h-px bg-gray-200" />

        <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      </div>
    </div>
  );
}
