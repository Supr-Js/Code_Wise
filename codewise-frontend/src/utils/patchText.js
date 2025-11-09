// src/utils/patchText.js
// 스니펫/간이 diff에서 원본/수정 코드만 뽑아내기
// - ed 스타일(4c4, 14a15,18 / <, >, ---)
// - 헤더 없는 간이 통합 diff(- / + prefix만 있는 케이스) 모두 지원

const DIFF_HEADER = /^(?:\d+(?:,\d+)?[acd]\d+(?:,\d+)?)$/; // ed-style 주소
const SEP_LINE = /^---$/;

export function extractFromSnippet(snippet) {
  if (!snippet) return { original: "", proposed: "" };
  const lines = String(snippet).split(/\r?\n/);

  // 통합 diff 헤더가 있는 경우는 여기서 처리하지 않음 (normalizeIssue 등 별도 로직으로 처리)
  const hasUnifiedHeader = lines.some(
    (l) => l.startsWith("--- ") || l.startsWith("+++ ") || l.startsWith("@@")
  );
  if (hasUnifiedHeader) return { original: "", proposed: "" };

  let originals = [];
  let proposals = [];
  let mode = "none"; // "orig" | "prop" | "none"
  let sawPlusMinus = false;

  for (let raw of lines) {
    if (raw == null) continue;
    const line = String(raw).replace(/\r$/, "").trimEnd();
    if (!line) continue;

    // ed-style 주소 행 무시
    if (DIFF_HEADER.test(line)) continue;

    // 구분선(---) → 이후는 제안 쪽으로
    if (SEP_LINE.test(line)) {
      mode = "prop";
      continue;
    }

    // ed-style prefix
    if (line.startsWith("<")) {
      mode = "orig";
      originals.push(line.replace(/^<\s?/, ""));
      continue;
    }
    if (line.startsWith(">")) {
      mode = "prop";
      proposals.push(line.replace(/^>\s?/, ""));
      continue;
    }

    // 헤더 없는 간이 통합 diff: - / +
    if (line.startsWith("-")) {
      originals.push(line.slice(1).replace(/^\s/, ""));
      sawPlusMinus = true;
      continue;
    }
    if (line.startsWith("+")) {
      proposals.push(line.slice(1).replace(/^\s/, ""));
      sawPlusMinus = true;
      continue;
    }

    // 접두가 없으면 직전 모드로 분배 (없으면 제안 쪽에 보강)
    if (mode === "orig") originals.push(line);
    else if (mode === "prop") proposals.push(line);
    else {
      // 아무 모드도 없고 +/−도 못 찾은 일반 라인은 제안쪽에 넣어 표시
      proposals.push(line);
    }
  }

  // +/− 감지가 전혀 없고, originals만 비어 있으면 "제안만 있는 스니펫"으로 간주
  if (!sawPlusMinus && originals.length === 0 && proposals.length > 0) {
    return { original: "", proposed: proposals.join("\n").trim() };
  }

  const original = originals.join("\n").trim();
  const proposed = proposals.join("\n").trim();

  return { original, proposed };
}