import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logoutUser } from "../api/auth";

export default function Header({ right }) {
  const nav = useNavigate();
  const onLogout = () => {
    logoutUser();
    nav("/login", { replace: true });
  };
  return (
    <div
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:16, gap:16
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <img src="/logo-ai.png" alt="logo" style={{width:28,height:28,borderRadius:6}}/>
        <div style={{fontWeight:800}}>CodeWise – AI 코드 분석</div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div>{right}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* 보라색 방지 + 로그아웃과 동일한 글자색 */}
          <Link
            to="/mypage"
            className="linkbtn"
            style={{
              padding:"8px 12px",
              border:"1px solid #e5e7eb",
              borderRadius:12,
              background:"#fff",
              color:"#111827",            // 로그아웃 글자색과 동일
              textDecoration:"none"
            }}
          >
            마이페이지
          </Link>
          <button
            onClick={onLogout}
            style={{
              padding:"8px 12px", border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", color:"#111827"
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}