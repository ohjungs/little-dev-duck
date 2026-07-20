# Status.md — 현재 Phase 진행 현황

현재 Phase: 1 (코어 기반) — 인프라/코드 전부 구축·자동검증 완료, **사용자의 실제 로그인 1회 클릭 확인만 남음**
계획 문서: docs/plans/phase_01.md
재개 방법: 새 대화에서 /next-step

## Phase 1 Task 체크
- [x] T1 모노레포 골격
- [x] T2 core 도메인 계약 v1 (계약 잠금 — Todo/Memo/Profile/DuckState 변경은 병렬 구간 밖에서만)
- [x] T3 디자인 토큰 + ui 기초 (apps/web에도 적용)
- [x] T4 Supabase 스키마 v1 + RLS — 완료. 프로젝트 `iupprzfmlyfrdcctdupn`(서울),
  마이그레이션 5개(profiles/todos/memos/duck_state + RLS + profiles 트리거) 적용됨.
- [x] T5 Auth (Google + GitHub) — 완료. Google/GitHub OAuth 클라이언트 등록 + Supabase Provider
  설정까지 끝났고, `/auth/v1/authorize?provider=google|github` 요청이 실제 Google/GitHub
  인증 페이지로 302 리다이렉트되는 것까지 curl로 확인함.
- [x] T6 CI/CD — 완료. GitHub Actions 그린, Vercel Analytics 연결, Vercel 프로젝트
  Root Directory=apps/web 설정, GitHub 저장소 git 연결 완료(push 시 자동배포),
  프로덕션 배포 확인(https://web-sepia-one-88.vercel.app). Sentry는 계정 미생성으로 [미해결] 이월.

## 마지막 남은 것 — 사용자 브라우저 클릭 1회

자동으로 확인 가능한 부분(리다이렉트, provider 활성화, RLS 마이그레이션, CI, 배포)은 전부 끝났다.
OAuth 로그인의 최종 콜백~세션~profiles 자동생성 연결은 실제 사람이 Google/GitHub 계정으로
"Allow" 버튼을 눌러야 확인되는 지점이라 에이전트가 대신할 수 없다.

1. https://web-sepia-one-88.vercel.app 접속 -> `/login` 화면에서 Google 또는 GitHub 로그인
2. 홈으로 복귀 후 "환영합니다" + 이름 표시 확인
3. Supabase 대시보드 Table Editor에서 `profiles` 1행 자동생성 확인
4. 새로고침 후 세션 유지, 로그아웃 -> `/login` 리다이렉트 확인
5. 결과를 다음 세션에 공유 -> Phase 1 종료 절차(/review, History.md 갱신, Phase 2 계획 초안) 진행

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 (Phase 3 전까지)
- Sentry 연동 [미해결, 이월] — 절차는 docs/setup/deploy-setup.md 5절
