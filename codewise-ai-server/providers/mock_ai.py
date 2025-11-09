from __future__ import annotations
import re
from typing import Dict, Any, List, Optional

def _simple_issues(code: str) -> List[Dict[str, Any]]:
    issues = []
    for i, line in enumerate(code.splitlines(), 1):
        if re.search(r'\bprintf\s*\(', line) and ';' not in line:
            issues.append({"line": i, "severity":"warn",
                           "message":"세미콜론(;) 누락 가능성", "suggestion":"; 추가",
                           "patch":""})
        if "TODO" in line or "FIXME" in line:
            issues.append({"line": i, "severity":"info",
                           "message":"TODO/FIXME 주석 존재", "suggestion":"작업 계획 확인",
                           "patch":""})
    return issues

def analyze(
    code: str,
    language: str = "auto",
    submissionId: Optional[str] = None,
    userId: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    if not code or not code.strip():
        raise ValueError("code is required")

    lines = code.splitlines()
    issues = _simple_issues(code)
    patch = ""
    if issues:
        patch = """--- original
+++ fixed
@@ -1,1 +1,1 @@
-printf("hello")
+printf("hello");
"""

    return {
        "summary": f"라인수 {len(lines)}, 이슈 {len(issues)}건",
        "metrics": {
            "loc": len(lines), "language": language,
            "maintainability_index": None, "avg_complexity": None,
            "mccabe_complexity": None, "blank": None, "comments": None,
            "todos": None, "max_complexity": None
        },
        "issues": issues,
        "fix": {"strategy": "patch" if issues else "none",
                "patch": patch if issues else "", "fixed_code": "" if issues else code},
        "source": "mock", "model": "mock",
        **({"submissionId": submissionId} if submissionId is not None else {}),
        **({"userId": userId} if userId is not None else {}),
    }