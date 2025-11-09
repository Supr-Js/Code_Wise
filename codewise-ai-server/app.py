# app.py
from __future__ import annotations
import os
from typing import Any, Dict, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS

from providers.openai_ai import analyze as openai_analyze  # noqa

PORT = int(os.getenv("PORT", "5050"))
DEBUG = os.getenv("DEBUG", "1") == "1"

app = Flask(__name__)
CORS(app)

@app.route("/healthz")
def healthz():
  return jsonify({"ok": True, "model": os.getenv("OPENAI_MODEL", "")})

@app.route("/analyze", methods=["POST"])
def analyze():
  try:
    payload: Dict[str, Any] = request.get_json(force=True, silent=False) or {}
    code: str = (payload.get("code") or "").strip()
    if not code:
      return jsonify({"error": "code is required"}), 400

    language: str = payload.get("language") or "auto"
    purpose: Optional[str] = payload.get("purpose")
    submissionId: Optional[str] = payload.get("submissionId")
    userId: Optional[str] = payload.get("userId")
    user_profile: Optional[Dict[str, Any]] = payload.get("user_profile")

    out: Dict[str, Any] = openai_analyze(
      code=code,
      language=language,
      purpose=purpose,
      submissionId=submissionId,
      userId=userId,
      user_profile=user_profile,
    )

    # 최소 진단 로그
    try:
      fx = (out.get("fix", {}) or {})
      fixed_len = len((fx.get("fixed_code") or out.get("fixed_code") or ""))
      patch_len = len((fx.get("patch") or out.get("patch") or ""))
      print("[OPENAI OUT] sum:", bool(out.get("summary")),
            "fix_len:", fixed_len, "patch_len:", patch_len)
    except Exception:
      pass

    return jsonify(out)
  except Exception as e:
    print("ERROR in /analyze:", repr(e))
    return jsonify({"error": "internal_error", "detail": str(e)}), 500

if __name__ == "__main__":
  print(f"* Running on 0.0.0.0:{PORT} (debug={DEBUG})")
  app.run(host="0.0.0.0", port=PORT, debug=DEBUG)