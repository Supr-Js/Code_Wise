// src/utils/issueUtils.js
export function normalizePatchSnippet(rawPatch) {
  if (!rawPatch || !String(rawPatch).trim()) {
    return { problem: null, suggest: null };
  }
  const lines = String(rawPatch).split(/\r?\n/);
  const junk = /^(?:@@|--- |\+\+\+ |index\s|diff\s|new file mode|deleted file mode|\d+c\d+|\d+a\d+(?:,\d+)?|\d+d\d+(?:,\d+)?)$/;
  const cleaned = lines
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => !junk.test(l));

  const removed = [];
  const added = [];
  const neutral = [];

  cleaned.forEach((l) => {
    if (!l) { neutral.push(l); return; }
    if (l.startsWith("-") || l.startsWith("<")) { removed.push(l.slice(1)); return; }
    if (l.startsWith("+") || l.startsWith(">")) { added.push(l.slice(1)); return; }
    if (l.startsWith(" ")) { neutral.push(l.slice(1)); return; }
    added.push(l);
  });

  const problem = removed.length ? removed.join("\n") : null;
  const suggest = (added.length ? added : neutral).join("\n").trim() || null;

  return { problem, suggest };
}

export function estimateComments(source, language) {
  if (!source) return 0;
  const lang = String(language || "").toLowerCase();

  if (["c","cpp","java","javascript","typescript","csharp","go","rust","kotlin","swift","php"].includes(lang)) {
    const lineComments = (source.match(/(^|\s)\/\/.*/gm) || []).length;
    const blockComments = (source.match(/\/\*/g) || []).length;
    return lineComments + blockComments;
  }
  if (["python","ruby"].includes(lang)) {
    return (source.match(/(^|\s)#.*/gm) || []).length;
  }
  return 0;
}

export function sortIssues(issues) {
  if (!Array.isArray(issues)) return [];
  const sevRank = { error: 0, warn: 1, info: 2 };

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY; // 라인 없는 이슈는 맨 뒤로
  };

  return [...issues].sort((a, b) => {
    const la = toNum(a?.line);
    const lb = toNum(b?.line);
    if (la !== lb) return la - lb;
    const sa = String(a?.severity || "info").toLowerCase();
    const sb = String(b?.severity || "info").toLowerCase();
    return (sevRank[sa] ?? 3) - (sevRank[sb] ?? 3);
  });
}
