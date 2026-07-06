# CodeWise: AI 기반 실시간 코드 분석 및 맞춤형 리팩터링 플랫폼

개발자가 작성한 코드의 품질을 실시간으로 진단하고, 단순 문법 오류 메시지를 넘어 개인 맞춤형 최적화 코드 및 시각화된 이슈 카드를 제공하는 교육 및 품질 개선 플랫폼입니다.

---

## Tech Stack (기술 스택)

### Frontend & AI Server (My Role)
- Frontend: React, TailwindCSS, Axios, StompJS, SockJS, Webpack
- AI Server: Python, Flask, OpenAI API (gpt-4o-mini), Gunicorn, Tenacity (Retry Library)
- Deployment: Vercel (Frontend Continuous Deployment), Render (AI Server)

### Backend & Database (Collaboration)
- Backend Framework: Java, Spring Boot, Spring Security
- Protocols & Auth: WebSocket (STOMP), JWT (JSON Web Token), OAuth 2.0 (Google Single Sign-On)
- Database & Infra: MySQL, AWS RDS, AWS EC2

---

## System Architecture & Data Flow

Frontend(React)와 백엔드(Spring Boot), AI 분석 서버(Flask)가 독립된 마이크로 서비스 형태로 유기적으로 맞물려 동작합니다.

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

## My Contributions (주요 담당 업무 & 핵심 구현 기술 설명)
1. Frontend Architecture & Real-time Integration (React)
STOMP 기반 웹소켓 양방향 통신 인프라 구축: HTTP 폴링 방식의 한계를 극복하고, SockJS와 @stomp/stompjs를 연동하여 실시간으로 코드 분석 요청을 발행하고 수신하는 비동기 파이프라인을 구축했습니다.

실시간 데이터 시각화 및 피드백 UI 개발: AI 서버로부터 전달받은 구조화된 진단 JSON 데이터를 파싱하여 중요도별 배지(ERROR, WARN, INFO), 라인별 하이라이팅, 코드 복사 및 자동 패치 적용 컴포넌트를 설계하여 사용자 경험을 고도화했습니다.

분석 이력 멱등성(Idempotency) 보장 설계: 네트워크 불안정으로 인한 이력 저장 중복 트랜잭션을 원천 차단하기 위해, 프론트 단에서 고유 키(X-Idempotency-Key)를 생성하여 헤더에 바인딩하는 방어적 텔레메트리 로직을 구현했습니다.

OAuth 2.0 및 JWT 인증 연동: 로컬 스토리지 기반 JWT 인증 인터셉터를 구축하여 모든 API 요청 시 토큰 자동 갱신 및 보안 컨텍스트를 유지하고, Google SSO 연동 리다이렉트 흐름을 완벽히 소화했습니다.

2. AI Code Analysis Server Design (Python/Flask)
Flask 기반 초경량 분석 파이프라인 구축: 대규모 코드 파싱 요청 처리를 위해 비동기 처리에 최적화된 Flask 분석 엔드포인트를 설계했습니다.

프롬프트 엔지니어링 및 JSON 스키마 강제화: 사용자가 지정한 분석 목적(일반 리팩터링, 보안 보강, 성능 최적화, 학습용 가독성)에 따라 OpenAI API가 일관되고 신뢰도 높은 정형화된 JSON 데이터 구조(Metrics, Issues, Unified Diff Patch)를 반환하도록 시스템 가이드라인을 정비했습니다.

안정적인 인프라 배포: Render 플랫폼을 통해 인프라를 프로비저닝하고, 가용 환경 변수 주입 및 실시간 헬스체크 단점(/healthz)을 개설하여 무중단 아키텍처의 기반을 다졌습니다.

## Project Structure (디렉토리 구조)

### Repository Monorepo Structure
```text
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

## 과제

문제 현상: HTTPS 환경으로 배포된 프론트엔드(Vercel)에서 HTTP 및 WS 프로토콜을 사용하는 백엔드/AI 인프라 호출 시 브라우저 보안 정책에 의해 통신이 전면 차단되는 현상 발생.

해결 방안: 개발 환경(.env.development)과 운영 배포 환경(.env.production)의 환경 변수를 철저히 분리하고, AI 서버 단에 flask-cors 설정을 통해 명시적 오리진 화이트리스트를 지정했습니다. 또한 백엔드에 SSL 인증서를 적용하여 모든 엔드포인트를 HTTPS/WSS(Secure WebSocket) 프로토콜로 승격시켜 보안 위배 문제를 완벽히 해결.