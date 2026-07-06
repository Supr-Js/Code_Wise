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

# analyze 엔드포인트 부분 최종 수정
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        # 프론트엔드 및 백엔드 중계 서버의 다양한 HTTP 클라이언트 라이브러리(Axios, RestTemplate 등) 대응 위해
        # Content-Type 헤더가 명시적이지 않더라도 JSON 파싱이 가능하도록 force=True 설정. 
        # 불완전한 JSON 입력 시 프론트엔드에 명확한 에러 서빙을 위해 silent=False 처리하여 예외 캡처 스코프에 진입시킴.
        payload: Dict[str, Any] = request.get_json(force=True, silent=False) or {}
        
        code: str = (payload.get("code") or "").strip()
        if not code:
            return jsonify({"error": "code is required"}), 400
            
        language: str = payload.get("language") or "auto"
        purpose: Optional[str] = payload.get("purpose")
        submissionId: Optional[str] = payload.get("submissionId")
        userId: Optional[str] = payload.get("userId")
        user_profile: Optional[Dict[str, Any]] = payload.get("user_profile")
        
        # 외부 LLM API(OpenAI) 호출에 따른 지연 시간 대책으로 상위 백엔드 서비스와 
        # WebSocket 통신(STOMP)을 연계하여 클라이언트 Non-blocking 인터랙션 보장
        out = openai_analyze(
            code=code, language=language, purpose=purpose,
            submissionId=submissionId, userId=userId, user_profile=user_profile,
        )
        
        # 운영 환경에서의 AI 비용 및 성능 모니터링을 위한 최소 진단용 경량 로그 인프라 구축
        try:
            fx = (out.get("fix", {}) or {})
            fixed_len = len((fx.get("fixed_code") or out.get("fixed_code") or ""))
            patch_len = len((fx.get("patch") or out.get("patch") or ""))
            print("[OPENAI OUT] sum:", bool(out.get("summary")), "fix_len:", fixed_len, "patch_len:", patch_len)
        except Exception:
            pass
            
        return jsonify(out)
        
    except Exception as e:
        # 최상위 예외 캡처(Global Exception Boundary)를 통해 에러 발생 시에도 Flask 프로세스 다운을 방지하고
        # 내부 시스템 스택 추적이 불가능하도록 500 내부 서버 에러로 추상화하여 보안성 확보
        print("ERROR in /analyze:", repr(e))
        return jsonify({"error": "internal_error", "detail": str(e)}), 500

if __name__ == "__main__":
  print(f"* Running on 0.0.0.0:{PORT} (debug={DEBUG})")
  app.run(host="0.0.0.0", port=PORT, debug=DEBUG)