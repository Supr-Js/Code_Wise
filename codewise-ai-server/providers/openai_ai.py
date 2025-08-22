# providers/openai_ai.py
from __future__ import annotations
from typing import Dict, Any
import os

def analyze(code: str, language: str = "auto") -> Dict[str, Any]:
    """
    OpenAI 등 외부 LLM 호출 예시(간략화). 실제 모델/프롬프트는 팀 컨벤션에 맞게 작성.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    model   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    # 최신 openai SDK 예시(필요 시 requirements에 openai 추가)
    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    prompt = f"""
You are a code reviewer. Analyze the following {language} code.
Return JSON with: metrics(loc, maintainability, complexity), summary, 
and issues(list of {{line, severity, message}}). 
Code:
"""
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    text = resp.choices[0].message.content

    # 팀 규약에 맞게 JSON 파싱/후처리(여기서는 그대로 전달)
    return {
        "mode": "openai",
        "raw": text
    }