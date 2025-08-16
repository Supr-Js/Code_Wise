# Code_Wise (Frontend)

## 프로젝트 구조
- `codewise-frontend/` : React + Tailwind v3 로그인 UI, Google 로그인 버튼 포함
  - `src/pages/Login.jsx` : 로그인 화면
  - `src/pages/EditorView.jsx` : 로그인 후 이동할 에디터 화면(임시)

## 개발 환경
- Node.js 18+
- npm 9+

## 로컬 실행
```bash
cd codewise-frontend
npm ci
cp .env.example .env   # 실제 키는 넣지 말고 팀원은 자신의 키를 넣어 사용
npm start