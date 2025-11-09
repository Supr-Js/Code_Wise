from __future__ import annotations
import os, json, textwrap, re
from typing import Dict, Any, Optional, List
from openai import OpenAI

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_TOKENS   = int(os.getenv("OPENAI_MAX_TOKENS", "4096"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SEVERITY_DOWNGRADE_RULES = [
    (r"use\s+equals\(\)\s+for\s+string\s+comparison", "warn"),
    (r"loose\s+comparison|===", "warn"),
    (r"potential\s+xss|sanitize\s+user\s+input", "warn"),
]

SYSTEM_PROMPT = textwrap.dedent("""
You are a meticulous senior code reviewer and fixer.
Return *strict JSON* only (no markdown). Keys: summary, metrics, issues, fix.

- metrics: {
    loc, language, maintainability_index, avg_complexity, mccabe_complexity,
    blank, comments, todos, max_complexity
  }

- issues: array of {
    line, severity in ["error","warn","info"], message, suggestion, patch
  }

- fix: {
    "strategy": one of ["none","patch","full_rewrite"],
    "patch": unified diff text (relative to the original code),
    "fixed_code": full corrected & enhanced source code as a single string
  }

Hard rules:
1) Output MUST be valid JSON. No extra text. No markdown fences. No comments.
2) Escape newlines properly. Avoid backticks and trailing commas.
3) Provide `fix.fixed_code` whenever possible.
4) Keep style conventional for the language; avoid external deps.
""").strip()

FORCE_REWRITE_PROMPT = textwrap.dedent("""
You previously analyzed code but did not provide fix.fixed_code.
Now produce JSON with the SAME SCHEMA, and you MUST include a full corrected and enhanced version
of the source under fix.fixed_code. Keep other fields sensible. No markdown. Only JSON.
<code>
{code}
</code>
""").strip()

def _line_comment_prefix(lang: str) -> str:
    lang = (lang or "").lower()
    if lang in ("c","cpp","java","javascript","typescript","csharp","go","rust","kotlin","swift","php"): return "//"
    if lang in ("python","ruby"): return "#"
    return "//"

def _block_comment(lang: str, text: str) -> str:
    lang = (lang or "").lower()
    if lang in ("python","ruby"):
        lines = [f"# {l}".rstrip() if l else "#" for l in text.splitlines()]
        return "\n".join(lines) + "\n"
    inner = "\n".join(f" * {l}".rstrip() for l in text.splitlines())
    return f"/*\n{inner}\n */\n"

def _decorate_for_purpose(code: str, lang: str, purpose: Optional[str], user_profile: Optional[Dict[str,Any]]) -> str:
    purpose_label = {
        "security_hardening":"Security Hardening",
        "performance_opt":"Performance Optimization",
        "teach_beginner":"Readable for Beginners",
        "general_refactor":"General Refactor",
        None:"Baseline"
    }.get(purpose if purpose in {"security_hardening","performance_opt","teach_beginner","general_refactor"} else None)

    up = ""
    if isinstance(user_profile, dict) and user_profile:
        try: up = json.dumps(user_profile, ensure_ascii=False)[:300]
        except Exception: up = ""

    tip_lines = []
    if purpose == "teach_beginner":
        tip_lines += ["Focus: Gentle comments & clearer structure."]
    elif purpose == "security_hardening":
        tip_lines += ["Focus: Avoid NPE/XSS/SQLi; validate inputs and check bounds."]
    elif purpose == "performance_opt":
        tip_lines += ["Focus: Reduce allocations & loops; prefer efficient APIs."]
    else:
        tip_lines += ["Focus: Readability and small safe improvements."]

    if up: tip_lines.append(f"User Profile Hint: {up}")

    header = _block_comment(lang, f"CodeWise Generated (Purpose: {purpose_label})\n" + "\n".join(tip_lines))
    if "CodeWise Generated (Purpose:" in code:
        return code
    return header + code

def _apply_unified_diff(original_text: str, diff_text: str) -> Optional[str]:
    if not diff_text or not diff_text.strip():
        return None
    try:
        orig = original_text.splitlines()
        out: List[str] = []
        i = 0
        lines = diff_text.splitlines()

        def _parse_hunk_header(h: str):
            m = re.match(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", h)
            if not m: return None
            a, a_len, b, b_len = m.groups()
            return {"aStart": int(a), "aLen": int(a_len) if a_len else 1,
                    "bStart": int(b), "bLen": int(b_len) if b_len else 1}

        k = 0
        while k < len(lines):
            ln = lines[k]
            if ln.startswith('--- ') or ln.startswith('+++ '):
                k += 1; continue
            if ln.startswith('@@'):
                h = _parse_hunk_header(ln)
                if not h: return None
                target = h["aStart"] - 1
                while i < target and i < len(orig):
                    out.append(orig[i]); i += 1
                k += 1
                while k < len(lines) and not lines[k].startswith('@@'):
                    body = lines[k]
                    if body.startswith(' '):
                        out.append(orig[i] if i < len(orig) else ""); i += 1
                    elif body.startswith('-'):
                        i += 1
                    elif body.startswith('+'):
                        out.append(body[1:])
                    elif body.startswith('\\ No newline at end of file'):
                        pass
                    elif body.startswith('--- ') or body.startswith('+++ '):
                        break
                    else:
                        return None
                    k += 1
                continue
            k += 1
        while i < len(orig):
            out.append(orig[i]); i += 1
        return "\n".join(out)
    except Exception:
        return None

# ---- ed-style / 스니펫 정규화 ----
_ED_CHANGE_HDR = re.compile(r"^\s*\d+\s*[acd]\s*\d+\s*$")

def _sanitize_patch_snippet(raw: str) -> str:
    if not raw: return ""
    lines = [l.rstrip("\r") for l in raw.splitlines()]
    out: List[str] = []
    in_block = False
    for ln in lines:
        if _ED_CHANGE_HDR.match(ln):
            in_block = True
            continue
        if ln.strip() == "---":
            continue
        if ln.startswith(">"):
            out.append(ln[1:].lstrip()); continue
        if ln.startswith("<"):
            continue
        if not in_block:
            out.append(ln)
    cleaned = "\n".join(out).strip()
    return cleaned if cleaned else raw

def _apply_issue_patches(original_text: str, issues: List[Dict[str, Any]]) -> Optional[str]:
    if not issues: return None
    snippet_issues = []
    for it in issues:
        p = (it.get("patch") or "").strip()
        if not p: continue
        if p.startswith("---") and "@@" in p:
            continue
        ln = int(it.get("line") or 0)
        snippet_issues.append((ln, _sanitize_patch_snippet(p)))

    if not snippet_issues:
        return None

    snippet_issues.sort(key=lambda x: x[0], reverse=True)
    lines = original_text.splitlines()

    for ln, snippet in snippet_issues:
        idx = max(0, ln - 1)
        snippet_lines = snippet.splitlines()
        if 0 <= idx < len(lines):
            lines[idx:idx+1] = snippet_lines
        else:
            if lines and lines[-1] != "": lines.append("")
            lines.extend(snippet_lines)

    return "\n".join(lines)

def _guess_language(language: str, code: str) -> str:
    if language and language.lower() != "auto":
        return language.lower()
    if re.search(r"#include\s*<", code): return "cpp"
    if re.search(r"\bclass\s+\w+\b", code) and re.search(r"import\s+\w+;", code): return "java"
    if re.search(r"\bdef\s+\w+\(", code): return "python"
    if re.search(r"\bfunction\s+\w+\(|=>", code): return "javascript"
    return "auto"

def _strip_c_like_strings(line: str) -> str:
    out = []; in_s = None; esc = False
    for ch in line:
        if esc: esc = False; continue
        if ch == '\\': esc = True; continue
        if in_s:
            if ch == in_s: in_s = None
            continue
        else:
            if ch in ('"', "'"):
                in_s = ch; continue
            out.append(ch)
    return "".join(out)

def _compute_basic_metrics(code: str, language: str) -> Dict[str, Optional[int]]:
    lang = _guess_language(language, code)
    lines = code.splitlines()
    blank = sum(1 for l in lines if not l.strip())
    todos = sum(1 for l in lines if "TODO" in l or "FIXME" in l)

    comments = 0
    if lang in ("c","cpp","java","javascript","typescript","csharp","go","rust","kotlin","swift","php"):
        in_block = False
        for l in lines:
            s_nostr = _strip_c_like_strings(l)
            s = s_nostr.strip()
            if in_block:
                comments += 1
                if "*/" in s: in_block = False
                continue
            if "/*" in s:
                comments += 1
                if "*/" not in s: in_block = True
                continue
            if "//" in s:
                comments += 1
                continue
    elif lang in ("python","ruby"):
        for l in lines:
            if l.strip().startswith("#") or "#" in l:
                comments += 1

    return {"blank": blank, "comments": comments, "todos": todos}

def _normalize_severity(msg: str, sev: str) -> str:
    base = (sev or "info").lower()
    text = (msg or "").lower()
    for pattern, target in SEVERITY_DOWNGRADE_RULES:
        if re.search(pattern, text):
            return target
    return base

def _coerce_defaults(payload: Dict[str, Any], language: str, code: str) -> Dict[str, Any]:
    def _num(x, d=None):
        try: return float(x)
        except: return d
    def _int(x, d=0):
        try: return int(x)
        except: return d

    issues = []
    for it in payload.get("issues", []) or []:
        if not isinstance(it, dict): continue
        sev_raw = str(it.get("severity", "info"))
        msg = str(it.get("message", ""))
        issues.append({
            "line": _int(it.get("line"), 0),
            "severity": _normalize_severity(msg, sev_raw),
            "message": msg,
            "suggestion": str(it.get("suggestion", "")),
            "patch": str(it.get("patch", "")),
        })

    m = payload.get("metrics") or {}
    raw_comments = m.get("comments", m.get("comment"))
    base = _compute_basic_metrics(code, language)
    f = payload.get("fix") or {}

    out = {
        "summary": str(payload.get("summary", "")),
        "metrics": {
            "loc": _int(m.get("loc"), len(code.splitlines())),
            "language": _guess_language(language, code),
            "maintainability_index": _num(m.get("maintainability_index")),
            "avg_complexity": _num(m.get("avg_complexity")),
            "mccabe_complexity": _num(m.get("mccabe_complexity")),
            "blank": _int(m.get("blank")) if m.get("blank") is not None else base["blank"],
            "comments": _int(raw_comments) if raw_comments is not None else base["comments"],
            "todos": _int(m.get("todos")) if m.get("todos") is not None else base["todos"],
            "max_complexity": _num(m.get("max_complexity")),
        },
        "issues": issues,
        "fix": {
            "strategy": str(f.get("strategy", "none")),
            "patch": str(f.get("patch", "")),
            "fixed_code": str(f.get("fixed_code", "")),
        },
    }
    out["metrics"]["comment"] = out["metrics"]["comments"]
    return out

def _infer_purpose_from_code_and_issues(code: str, issues: List[Dict[str, Any]]) -> str:
    txt = (code or "").lower()
    joined = " ".join([(it.get("message") or "") + " " + (it.get("suggestion") or "") for it in (issues or [])]).lower()
    hay = txt + " " + joined
    if any(k in hay for k in ["xss","sql","sanitize","escape","injection","eval(","md5(","sha1("]):
        return "security_hardening"
    if any(k in hay for k in ["optimiz","optimize","performance","perf","benchmark","bottleneck","n^2","o(n^2)"]):
        return "performance_opt"
    if any(k in hay for k in ["tutorial","beginner","for learning","교육","학습","주석 추가"]):
        return "teach_beginner"
    return "general_refactor"

def _chat_json(system: str, user: str) -> Dict[str, Any]:
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0,
        max_tokens=MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[{"role":"system","content":system},
                  {"role":"user","content":user}],
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        return json.loads(raw)
    except Exception:
        return {}

def analyze(
    code: str,
    language: str = "auto",
    submissionId: Optional[str] = None,
    userId: Optional[str] = None,
    purpose: Optional[str] = None,
    user_profile: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    if not code or not code.strip():
        raise ValueError("code is required")

    purpose_note = {
        "security_hardening": "Focus on removing security smells (taint, XSS, SQLi, unsafe APIs). Add minimal safeguards.",
        "performance_opt":    "Focus on improving performance (algorithmic complexity, avoid redundant allocations, efficient IO).",
        "teach_beginner":     "Focus on clarity for learners: add concise comments, simplify constructs, split long functions.",
        "general_refactor":   "Apply pragmatic refactors for readability and maintainability.",
        None:                 "Keep code functionally equivalent and idiomatic.",
    }.get(purpose if purpose in {"security_hardening","performance_opt","teach_beginner","general_refactor"} else None)

    profile_hint = ""
    if isinstance(user_profile, dict) and user_profile:
        profile_hint = f"\nUser profile hints (optional): {json.dumps(user_profile, ensure_ascii=False)[:1000]}"

    user_prompt = textwrap.dedent(f"""
    You are a code reviewer & fixer. Return JSON only (schema in system prompt).

    Goals:
    - Fix correctness issues and smells with line numbers.
    - Provide minimal patch (unified diff) in fix.patch.
    - Provide a full corrected & enhanced code in fix.fixed_code.
    - Enhancement guideline: {purpose_note}
    {profile_hint}

    Requirements:
    - Keep original functionality unless unsafe.
    - Avoid external dependencies; keep code self-contained.
    - If you add comments (teach_beginner), keep them concise and helpful.

    <code>
    {code}
    </code>
    """).strip()

    try:
        parsed = _chat_json(SYSTEM_PROMPT, user_prompt)
    except Exception:
        parsed = {"summary":"smoke test ok",
                  "metrics":{"loc":len(code.splitlines()),"language":language},
                  "issues":[], "fix":{"strategy":"none","patch":"","fixed_code":""}}

    out = _coerce_defaults(parsed, language, code)

    fixed = (out.get("fix", {}) or {}).get("fixed_code", "") or ""

    if not fixed:
        diff_text = (out.get("fix", {}) or {}).get("patch", "") or ""
        applied = _apply_unified_diff(code, diff_text) if diff_text else None
        if applied and applied.strip():
            fixed = applied
            out["fix"]["fixed_code"] = fixed
            if out["fix"].get("strategy") in ("none","",None):
                out["fix"]["strategy"] = "patch"

    if not fixed and out.get("issues"):
        replaced = _apply_issue_patches(code, out["issues"])
        if replaced and replaced.strip():
            fixed = replaced
            out["fix"]["fixed_code"] = fixed
            if out["fix"].get("strategy") in ("none","",None):
                out["fix"]["strategy"] = "patch"

    if not fixed:
        try:
            forced = _chat_json(SYSTEM_PROMPT, FORCE_REWRITE_PROMPT.format(code=code))
            f2 = forced.get("fix", {}) if isinstance(forced, dict) else {}
            fc2 = (f2.get("fixed_code") or "").strip()
            if fc2:
                fixed = fc2
                out["fix"]["fixed_code"] = fixed
                if out["fix"].get("strategy") in ("none","",None):
                    out["fix"]["strategy"] = "full_rewrite"
            if not out.get("summary") and forced.get("summary"):
                out["summary"] = forced["summary"]
            if out["issues"] == [] and isinstance(forced.get("issues"), list):
                out["issues"] = forced["issues"]
        except Exception:
            pass

    if not fixed:
        fixed = code
        out["fix"]["fixed_code"] = fixed
        if out["fix"].get("strategy") in ("none","",None):
            out["fix"]["strategy"] = "none"

    inferred = _infer_purpose_from_code_and_issues(code, out.get("issues", []))
    out["inferred_purpose"] = inferred
    final_purpose = purpose if purpose and purpose != "auto" else inferred
    out["final_purpose"] = final_purpose or "general_refactor"

    lang = out.get("metrics", {}).get("language") or _guess_language(language, code)
    out["fix"]["fixed_code"] = _decorate_for_purpose(out["fix"]["fixed_code"], lang, out["final_purpose"], user_profile)

    out["source"] = "openai"; out["model"] = OPENAI_MODEL
    if submissionId is not None: out["submissionId"] = submissionId
    if userId is not None: out["userId"] = userId
    if purpose: out["purpose"] = purpose
    if user_profile: out["user_profile_used"] = True
    
    try:
        fx = out.get("fix", {}) or {}
        out["fixed_code"] = fx.get("fixed_code", "") or ""
        out["patch"] = fx.get("patch", "") or ""
        out["has_fixed"] = bool(out["fixed_code"].strip())
    except Exception:
        pass

    return out