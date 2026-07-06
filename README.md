# 💡 CodeWise: AI 기반 실시간 코드 분석 및 맞춤형 리팩터링 플랫폼
 
> 개발자가 작성한 코드의 품질을 실시간으로 진단하고, 단순 문법 오류 메시지를 넘어 개인 맞춤형 최적화 코드 및 시각화된 이슈 카드를 제공하는 학습 중심의 코드 품질 개선 도구입니다.

---

##  Tech Stack (기술 스택)

### Frontend & AI Server (My Role)
- **Frontend:** React, TailwindCSS, Axios, StompJS, SockJS, Webpack
- **AI Server:** Python, Flask, OpenAI API (gpt-4o-mini), Gunicorn, Tenacity (Retry Library)
- **Deployment:** Vercel (Frontend CD), Render (AI Server)

### Backend & Database (Collaboration)
- **Backend Framework:** Java, Spring Boot, Spring Security
- **Protocols & Auth:** WebSocket (STOMP), JWT (JSON Web Token), OAuth 2.0 (Google Single Sign-On)
- **Database & Infra:** MySQL, AWS RDS, AWS EC2

---

##  System Architecture & Data Flow

Frontend(React)와 백엔드(Spring Boot), AI 분석 서버(Flask)가 독립된 마이크로 서비스 형태로 유기적으로 맞물려 동작합니다.

```text
[Client (React)] 
      │ 
      │ (1) WebSocket STOMP Connection (Real-time)
      ▼
[Backend (Spring Boot / EC2)]
      │
      │ (2) HTTP POST Sync Request
      ▼
[AI Server (Flask / Render)] ───(3) ChatCompletion API───► [OpenAI API]
      │                                                         │
      │ (4) Structured JSON Response ◄──────────────────────────┘
      ▼
[Backend (Spring Boot)]
      │
      ├─► (5) Persistence Layer (MySQL / AWS RDS) -> 통계 및 이력 축적
      │
      └─► (6) WebSocket Push (Private User Queue)
      ▼
[Client (React UI Visualization)] -> 실시간 메트릭 및 이슈 카드 바인딩


Project Structure (디렉토리 구조)
Code_Wise/
├── codewise-ai-server/          # AI 분석 서버 (Python/Flask)
│   ├── providers/               # LLM 모델 연동용 알고리즘 레이어
│   ├── app.py                   # 분석 엔드포인트 및 서버 컨트롤러
│   └── requirements.txt         # 파이썬 의존성 환경 정보
└── codewise-frontend/           # 사용자 인터페이스 (React)
    ├── public/                  # 정적 애셋 및 메타 파일
    └── src/
        ├── api/                 # 통신/인증/원격 텔레메트리 모듈 (Axios)
        ├── components/          # 공통 컴포넌트 (Header 등)
        ├── pages/               # 핵심 화면 (EditorView, Login, MyPage, Signup)
        ├── socket/              # STOMP / SockJS 실시간 웹소켓 핸들러
        └── styles.css           # UI 테마 정의 및 시각화 스타일 가이드


My Contributions (주요 담당 업무 & 핵심 구현 기술)

1. Frontend Architecture & Real-time Integration (React)

STOMP 기반 웹소켓 양방향 통신 인프라 구축: HTTP 폴링 방식의 한계를 극복하고, SockJS와 @stomp/stompjs를 연동하여 실시간 비동기 파이프라인을 구축했습니다.

실시간 데이터 시각화 및 피드백 UI 개발: AI 서버의 진단 데이터를 파싱하여 중요도별 배지, 라인별 에러 스레딩, 자동 패치 적용 컴포넌트를 설계했습니다.

분석 이력 멱등성(Idempotency) 보장 설계: 중복 트랜잭션을 차단하기 위해 프론트 단에서 고유 식별키(X-Idempotency-Key)를 발행하는 방어적 로직을 구현했습니다.

OAuth 2.0 및 JWT 인증 연동: Axios 인터셉터 기반의 JWT 자동 주입 및 Google SSO 리다이렉트 흐름을 완벽히 소화했습니다.

2. AI Code Analysis Server Design (Python/Flask)

Flask 기반 초경량 분석 파이프라인 구축: 대규모 코드 파싱 요청 처리를 위해 최적화된 Flask 분석 엔드포인트를 설계했습니다.

프롬프트 엔지니어링 및 JSON 규격화: AI 모델이 정형화된 JSON 응답(Metrics, Issues, Unified Diff Patch)을 반환하도록 프롬프트를 정교화했습니다.

안정적인 클라우드 인프라 배포: Render 플랫폼을 통해 인프라를 프로비저닝하고 무중단 서버 운영을 위한 실시간 헬스체크(/healthz)를 구현했습니다.

# Troubleshooting

Mixed Content 및 CORS 정책 충돌로 인한 아키텍처 통신 차단 해결

문제 현상: HTTPS 환경으로 배포된 프론트엔드에서 HTTP/WS 기반의 백엔드 호출 시 브라우저 보안 정책(Mixed Content)에 의해 통신이 차단됨.

해결 방안: 환경 변수를 전면 분리하고, AI 서버 단에 flask-cors 오리진 화이트리스트를 구축했습니다. 나아가 백엔드에 SSL 인증서를 적용하여 모든 게이트웨이를 HTTPS 및 WSS 보안 프로토콜로 승격시켜 보안 위배 문제를 근본적으로 해결했습니다.