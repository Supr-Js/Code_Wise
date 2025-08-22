# providers/mock_ai.py
from __future__ import annotations
from typing import Dict, Any, List
import re

# radon으로 복잡도/MI 측정
try:
    from radon.complexity import cc_visit
    from radon.metrics import mi_visit
except Exception:
    cc_visit = None
    mi_visit = None


def _simple_suggestions(code: str) -> List[Dict[str, Any]]:
    suggestions = []
    lines = code.splitlines()

    for i, line in enumerate(lines, 1):
        if len(line) > 120:
            suggestions.append({
                "line": i,
                "severity": "info",
                "message": "라인 길이가 120자를 초과합니다. 줄바꿈/가독성 개선을 고려하세요."
            })
        if "TODO" in line or "FIXME" in line:
            suggestions.append({
                "line": i,
                "severity": "warn",
                "message": "TODO/FIXME 주석이 있습니다. 처리 계획을 확인하세요."
            })
        if re.match(r"^\s*print\s*\(", line):
            suggestions.append({
                "line": i,
                "severity": "info",
                "message": "print 사용 감지. 로깅 라이브러리 사용을 고려하세요."
            })
    return suggestions


def analyze(code: str, language: str = "auto") -> Dict[str, Any]:
    """
    간단/결정적 분석(네트워크 호출 없음).
    - LOC/빈줄/주석 추정
    - Cyclomatic Complexity 평균/최대 (radon 사용)
    - Maintainability Index (radon 사용)
    - 간단한 제안 리스트
    """
    lines = code.splitlines()
    loc = len(lines)
    blank = sum(1 for l in lines if not l.strip())
    comments = sum(1 for l in lines if l.strip().startswith(("#", "//", "/*", "*", "--")))
    todos = sum(1 for l in lines if "TODO" in l or "FIXME" in l)

    avg_cc = None
    max_cc = None
    mi = None

    if cc_visit:
        try:
            blocks = cc_visit(code)
            if blocks:
                vals = [b.complexity for b in blocks]
                avg_cc = sum(vals) / len(vals)
                max_cc = max(vals)
        except Exception:
            pass

    if mi_visit:
        try:
            mi = mi_visit(code, True)  # multi=True
            # 범위 0~100, 값이 높을수록 유지보수성 좋음
        except Exception:
            pass

    suggestions = _simple_suggestions(code)

    # 요약 메시지
    summary = f"라인수 {loc}, 공백 {blank}, 주석 {comments}, TODO {todos}"
    if avg_cc is not None:
        summary += f", 평균 복잡도 {avg_cc:.2f}"
    if mi is not None:
        summary += f", MI {mi:.1f}"

    return {
        "mode": "mock",
        "metrics": {
            "loc": loc,
            "blank": blank,
            "comments": comments,
            "todos": todos,
            "avg_complexity": avg_cc,
            "max_complexity": max_cc,
            "maintainability_index": mi,
            "language": language,
        },
        "issues": suggestions,  # [{ line, severity, message }]
        "summary": summary,
    }
