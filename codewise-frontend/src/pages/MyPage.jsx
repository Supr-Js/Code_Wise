// src/pages/MyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getMe, deleteMe } from "../api/auth";
import { getUserStats } from "../api/stats";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

export default function MyPage() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ topLanguages: [], topPurposes: [], topErrors: [] });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const m = await getMe();
        setMe(m);
      } catch {
        setErr("내 정보 불러오기 실패. 새로고침 후 다시 시도해주세요.");
      }
      try {
        const s = await getUserStats(); // { topLanguages, topPurposes, topErrors }
        setStats({
          topLanguages: Array.isArray(s?.topLanguages) ? s.topLanguages : [],
          topPurposes: Array.isArray(s?.topPurposes) ? s.topPurposes : [],
          topErrors: Array.isArray(s?.topErrors) ? s.topErrors : [],
        });
      } catch {
        setStats({ topLanguages: [], topPurposes: [], topErrors: [] });
      }
    })();
  }, []);

  const renderStats = useMemo(() => {
    const mapToPairs = (list, key) =>
      Array.isArray(list) ? list.map((it) => [it?.[key] ?? "알 수 없음", it?.count ?? 0]) : [];
    return {
      byLang: mapToPairs(stats.topLanguages, "language"),
      byPurpose: mapToPairs(stats.topPurposes, "purpose"),
      byError: mapToPairs(stats.topErrors, "error"),
    };
  }, [stats]);

  const onDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      setBusy(true);
      await deleteMe();
      localStorage.removeItem("token");
      nav("/login", { replace: true });
    } catch (e) {
      alert("회원 탈퇴에 실패했습니다: " + (e?.response?.data || e.message));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 24px" }}>
      <Header />
      {err && (
        <div style={{ marginBottom: 12, color: "#dc2626", fontSize: 13 }}>
          {err}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>내 정보</div>
        <div style={{ fontSize: 14 }}>
          <div>이메일: <b>{me?.email || "-"}</b></div>
          <div>권한: <b>{me?.role || "-"}</b></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>많이 사용한 언어</div>
          {renderStats.byLang.length === 0 ? (
            <div className="text-muted">데이터 없음</div>
          ) : (
            <ul>
              {renderStats.byLang.map(([k, v]) => (
                <li key={k}>{k}: <b>{v}</b></li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>많이 선택한 목적</div>
          {renderStats.byPurpose.length === 0 ? (
            <div className="text-muted">데이터 없음</div>
          ) : (
            <ul>
              {renderStats.byPurpose.map(([k, v]) => (
                <li key={k}>{k}: <b>{v}</b></li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>자주 발생한 오류 TOP10</div>
          {renderStats.byError.length === 0 ? (
            <div className="text-muted">데이터 없음</div>
          ) : (
            <ol>
              {renderStats.byError.map(([k, v]) => (
                <li key={k}>{k}: <b>{v}</b></li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>회원 탈퇴</div>
        <p className="text-sm text-gray-600">탈퇴 시 모든 개인화 데이터가 제거됩니다.</p>
        <div className="flex items-center gap-8 mt-2">
          <button className="btn" onClick={() => window.location.href = "/editor"}>코드 분석으로 돌아가기</button>
          <button className="btn ghost" onClick={onDelete} disabled={busy}>
            {confirming ? "정말 탈퇴하시겠습니까? (다시 클릭 시 진행)" : "회원 탈퇴"}
          </button>
        </div>
      </div>
    </div>
  );
}