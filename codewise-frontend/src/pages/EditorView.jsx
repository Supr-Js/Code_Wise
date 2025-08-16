import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../api/auth';

export default function EditorView() {
  const nav = useNavigate();
  const logout = () => { logoutUser(); nav('/login'); };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 rounded-lg border shadow">
        <h2 className="text-xl font-bold mb-3">에디터 대시보드 (모의)</h2>
        <p className="text-gray-600 mb-4">로그인 성공 후 진입한 화면입니다.</p>
        <button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}
