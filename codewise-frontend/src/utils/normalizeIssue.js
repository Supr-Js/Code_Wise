// src/utils/normalizeIssue.js
// 통합 diff/스니펫을 받아 "원문"과 "수정문"을 분리해 반환
export function parseUnifiedSnippet(patch = "") {
  if (!patch || typeof patch !== "string") {
    return { original: "", suggestion: "" };
  }
  const lines = patch.replace(/\r\n/g, "\n").split("\n");

  // 통합 diff 형태인지 감지
  const isUnified =
    lines.some((l) => l.startsWith("--- ") || l.startsWith("+++ ")) ||
    lines.some((l) => /^@@\s-/.test(l));

  if (!isUnified) {
    // 단순 스니펫이면 그대로 suggestion으로만 반환
    return { original: "", suggestion: patch.trim() };
  }

  const orig = [];
  const sugg = [];

  for (const ln of lines) {
    if (!ln) continue;
    if (ln.startsWith("--- ") || ln.startsWith("+++ ") || ln.startsWith("@@")) {
      continue; // 헤더/헝크는 제거
    }
    if (ln.startsWith("-")) {
      orig.push(ln.slice(1));
    } else if (ln.startsWith("+")) {
      sugg.push(ln.slice(1));
    } else if (ln.startsWith(" ")) {
      // 공통라인은 원문에도, 제안에도 포함하지 않음(최소 스니펫만 보기 위해)
      continue;
    } else if (ln.startsWith("\\ No newline at end of file")) {
      continue;
    }
  }

  return {
    original: orig.join("\n").trim(),
    suggestion: sugg.join("\n").trim(),
  };
}

export function normalizeIssues(rawIssues = []) {
  if (!Array.isArray(rawIssues)) return [];
  return rawIssues
    .map((it) => {
      const line = Number.isFinite(it?.line) ? it.line : null;
      const severity = (it?.severity || "info").toLowerCase();
      const message = String(it?.message || "");
      const suggestion = String(it?.suggestion || "");
      const patch = String(it?.patch || "");

      const { original, suggestion: parsedSuggestion } = parseUnifiedSnippet(patch);
      const suggestionBlock = parsedSuggestion || patch || suggestion || "";

      return {
        line,
        severity,
        message,
        suggestion,
        patch,
        originalSnippet: original,
        suggestionSnippet: suggestionBlock,
      };
    })
    .sort((a, b) => {
      const la = a.line ?? 0;
      const lb = b.line ?? 0;
      if (la !== lb) return la - lb;
      const rank = { error: 0, warn: 1, info: 2 };
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    });
}