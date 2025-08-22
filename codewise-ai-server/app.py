# app.py
from __future__ import annotations
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "5050"))
CORS_ORIGIN = [o.strip() for o in os.getenv("CORS_ORIGIN", "*").split(",")]
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

# Provider 선택
if MOCK_MODE:
    from providers import mock_ai as ai
else:
    try:
        from providers import openai_ai as ai
    except Exception:
        # 안전장치: openai 준비가 안되어도 mock으로 fallback
        from providers import mock_ai as ai

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": CORS_ORIGIN}})

@app.get("/health")
def health():
    return jsonify({"status": "ok", "mode": "mock" if MOCK_MODE else "openai"}), 200

@app.post("/analyze")
def analyze():
    """
    요청 바디(JSON):
    {
      "code": "string",         # 필수
      "language": "python|java|js|auto",  # 선택
      "submissionId": 123,      # 선택(백엔드 연계용)
      "userId": 456             # 선택(백엔드 연계용)
    }
    응답(JSON):
    {
      "metrics": {...},
      "issues": [{line, severity, message}],
      "summary": "..."
    }
    """
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    language = (data.get("language") or "auto").strip()

    if not code:
        return jsonify({"error": "code is required"}), 400

    try:
        result = ai.analyze(code, language)
        # 필요 시 submissionId/userId를 그대로 반사
        for k in ("submissionId", "userId"):
            if k in data:
                result[k] = data[k]
        return jsonify(result), 200
    except Exception as e:
        # 서버 내부 에러
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # 개발용 실행 (배포는 waitress/gunicorn 권장)
    app.run(host="0.0.0.0", port=PORT, debug=True)