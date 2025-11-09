// src/pages/EditorView.jsx
import React, { useState, useMemo, useCallback } from "react";
import { useStomp } from "../socket/StompProvider";
import { applyUnifiedDiff } from "../utils/patch";
import { extractFromSnippet } from "../utils/patchText";
import { parseUnifiedSnippet } from "../utils/normalizeIssue";
import { sortIssues } from "../utils/issueUtils";
import Header from "../components/Header";
import "../styles.css";

const LANGS = [
  { value: "auto", label: "Auto (자동 감지)" },
  { value: "c", label: "C" }, { value: "cpp", label: "C++" },
  { value: "java", label: "Java" }, { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" }, { value: "python", label: "Python" },
  { value: "go", label: "Go" }, { value: "rust", label: "Rust" },
  { value: "kotlin", label: "Kotlin" }, { value: "swift", label: "Swift" },
  { value: "csharp", label: "C#" }, { value: "php", label: "PHP" }, { value: "ruby", label: "Ruby" },
];

const PURPOSES = [
  { value: "auto", label: "Auto (자동)" },
  { value: "general_refactor", label: "일반 리팩터링" },
  { value: "security_hardening", label: "보안 보강" },
  { value: "performance_opt", label: "성능 최적화" },
  { value: "teach_beginner", label: "학습용(가독성/주석)" },
];

function copyText(text) {
  if (!text) return;
  const str = String(text);
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(str).catch(() => fallback(str));
  }
  return fallback(str);

  function fallback(t) {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    const sel = document.getSelection();
    const saved = [];
    if (sel && sel.rangeCount) for (let i = 0; i < sel.rangeCount; i++) saved.push(sel.getRangeAt(i));
    ta.select();
    try { document.execCommand("copy"); } finally {
      document.body.removeChild(ta);
      if (sel) {
        sel.removeAllRanges();
        saved.forEach(r => sel.addRange(r));
      }
    }
  }
}

function CodeBlock({ text, variant = "neutral" }) {
  const disabled = !text || !String(text).trim();
  const onCopy = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (!disabled) copyText(String(text));
  }, [disabled, text]);
  return (
    <div className={`codewrap ${variant}`}>
      <pre className="code">{disabled ? "// 제공된 코드가 없습니다." : text}</pre>
      <button type="button" className="copybtn" disabled={disabled} onClick={onCopy} aria-label="copy">copy</button>
    </div>
  );
}

function BestCodeBlock({ text }) {
  const disabled = !text || !String(text).trim();
  const onCopy = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (!disabled) copyText(String(text));
  }, [disabled, text]);
  return (
    <div className="bestcode">
      <pre>{disabled ? "// 제공된 코드가 없습니다." : text}</pre>
      <button type="button" className="copybtn" disabled={disabled} onClick={onCopy} aria-label="copy">copy</button>
    </div>
  );
}

function IssueCard({ issue }) {
  const sevRaw = (issue.severity || "info").toLowerCase();
  const sevClass = sevRaw === "error" ? "err" : (sevRaw === "warn" ? "warn" : "info");
  const sevLabel = sevRaw.toUpperCase();
  const suggestion = issue.suggestion && String(issue.suggestion).trim();
  const rawPatch = issue.patch && String(issue.patch).trim();

  let original = (issue.originalSnippet && String(issue.originalSnippet).trim()) || "";
  let proposed = (issue.suggestionSnippet && String(issue.suggestionSnippet).trim()) || "";

  if ((!original && !proposed) && rawPatch && (rawPatch.includes("\n@@") || rawPatch.startsWith("--- "))) {
    const parsed = parseUnifiedSnippet(rawPatch);
    original = parsed.original || "";
    proposed = parsed.suggestion || "";
  }

  if ((!original && !proposed) && rawPatch) {
    const ex = extractFromSnippet(rawPatch);
    original = ex.original || "";
    proposed = ex.proposed || "";
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="card-head">
        <div className="line">Line {issue.line ?? "-"}</div>
        <span className={`badge ${sevClass}`}>{sevLabel}</span>
      </div>
      <div className="msg">{issue.message}</div>
      {suggestion && <div className="hint">제안: {suggestion}</div>}

      {original && (
        <>
          <div className="blocktitle bad">문제가 된 코드</div>
          <CodeBlock text={original} variant="bad" />
        </>
      )}

      {proposed && (
        <>
          <div className="blocktitle good">수정 예시</div>
          <CodeBlock text={proposed} variant="good" />
        </>
      )}

      {!original && !proposed && rawPatch && (
        <>
          <div className="blocktitle good">수정 예시</div>
          <CodeBlock text={rawPatch} variant="good" />
        </>
      )}
    </div>
  );
}

export default function EditorView() {
  const { sendAnalyze, lastResult, connected } = useStomp();
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("auto");
  const [purpose, setPurpose] = useState("general_refactor");
  const [autoApplyPatch, setAutoApplyPatch] = useState(true);

  const onAnalyze = () => {
    if (!code.trim()) return;
    sendAnalyze({ code, language: lang, purpose });
  };

  const metrics = lastResult?.metrics || {};

  // 🔧 ESLint 경고 해결: useMemo의 deps를 lastResult?.issues로 고정
  const rawIssues = lastResult?.issues;
  const sortedIssues = useMemo(() => {
    const arr = Array.isArray(rawIssues) ? rawIssues : [];
    return sortIssues(arr);
  }, [rawIssues]);

  const patch = (lastResult?.fix?.patch || "").trim();
  const fixed = (lastResult?.fix?.fixed_code || "").trim();

  const bestCode = useMemo(() => {
    if (fixed) return { text: fixed, type: "fixed" };
    if (patch && autoApplyPatch) {
      const applied = applyUnifiedDiff(code, patch);
      if (applied && applied.trim()) return { text: applied, type: "applied" };
    }
    if (patch) return { text: patch, type: "patch" };
    return { text: "", type: "original" };
  }, [fixed, patch, autoApplyPatch, code]);

  return (
    <div style={{ minHeight: "100vh", padding: "20px 24px" }}>
      <Header
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="control">
              <div className="label">언어 선택</div>
              <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="control">
              <div className="label">분석 목적</div>
              <select className="select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="status">STOMP: {connected ? "connected" : "disconnected"}</div>
          </div>
        }
      />

      <div
        className="layout-v2"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 16,
        }}
      >
        <div className="cell editor" style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}>
          <div className="card pad">
            <div className="cardbar">
              <div className="title">코드 입력</div>
              <div className="muted">STOMP 상태: {connected ? "connected" : "disconnected"}</div>
            </div>

            <textarea
              className="input editor"
              placeholder="// 여기에 코드를 붙여넣고 [분석 요청]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => copyText(code)}>입력 코드 복사</button>
              <button className="btn" type="button" onClick={onAnalyze}>분석 요청</button>
            </div>
          </div>
        </div>

        <div className="cell side" style={{ gridColumn: "2 / 3", gridRow: "1 / 2" }}>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <div className="title">요약</div>
            <div className={lastResult?.summary ? "text" : "muted"}>
              {lastResult?.summary || "분석 결과가 여기에 표시됩니다."}
            </div>
          </div>

          <div className="card pad">
            <div className="title">메트릭</div>
            <div className="grid-metrics">
              <div className="metric"><div>LOC</div><b>{metrics.loc ?? "-"}</b></div>
              <div className="metric"><div>Language</div><b>{metrics.language ?? "-"}</b></div>
              <div className="metric"><div>Comments</div><b>{metrics.comments ?? "-"}</b></div>
              <div className="metric"><div>Blank</div><b>{metrics.blank ?? "-"}</b></div>
              <div className="metric"><div>TODOs</div><b>{metrics.todos ?? "-"}</b></div>
              <div className="metric"><div>MI</div><b>{metrics.maintainability_index ?? "-"}</b></div>
              <div className="metric"><div>Avg Complexity</div><b>{metrics.avg_complexity ?? "-"}</b></div>
              <div className="metric"><div>McCabe</div><b>{metrics.mccabe_complexity ?? "-"}</b></div>
              <div className="metric"><div>Max Complexity</div><b>{metrics.max_complexity ?? "-"}</b></div>
            </div>
          </div>
        </div>

        <div className="cell best" style={{ gridColumn: "1 / 2", gridRow: "2 / 3" }}>
          <div className="card pad">
            <div className="row between">
              <div className="title">최적 코드{bestCode.type === "patch" ? " (패치 보기)" : ""}</div>
              <label className="autoapply">
                <span>자동 적용 패치</span>
                <input
                  type="checkbox"
                  checked={autoApplyPatch}
                  onChange={(e) => setAutoApplyPatch(e.target.checked)}
                />
              </label>
            </div>

            <div className="muted small">
              {bestCode.type === "fixed"
                ? "서버가 수정된 전체 코드를 제공했습니다."
                : bestCode.type === "applied"
                ? "서버의 diff 패치를 입력 코드에 자동 적용한 결과입니다."
                : bestCode.type === "patch"
                ? "서버가 diff 패치를 제공했습니다. 수동 적용하거나 자동 적용을 켜세요."
                : "서버가 최적 코드를 제공하지 않았습니다."}
            </div>

            {bestCode.type !== "original" ? (
              <BestCodeBlock text={bestCode.text} />
            ) : (
              <div className="notice">
                현재 입력 코드에서 <b>이슈 카드의 “수정 예시”</b>를 참고해 직접 반영하시거나,
                <b> 자동 적용 패치</b>를 켜고 다시 분석해 보세요.
              </div>
            )}
          </div>
        </div>

        <div className="cell issues" style={{ gridColumn: "2 / 3", gridRow: "2 / 3" }}>
          <div className="card pad">
            <div className="row between">
              <div className="title">이슈</div>
              <div className="muted small">{sortedIssues.length}건</div>
            </div>
            <div className="issuegrid">
              {sortedIssues.length === 0
                ? <div className="muted">감지된 이슈가 없습니다.</div>
                : sortedIssues.slice(0, 200).map((it, idx) => <IssueCard key={idx} issue={it} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}