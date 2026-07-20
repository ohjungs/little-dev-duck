# Status.md — 현재 Phase 진행 현황

현재 Phase: 1 (코어 기반) — 코드 작성 + GitHub 연결/CI 통과 완료, **Supabase/OAuth/Vercel 계정 설정 대기**
계획 문서: docs/plans/phase_01.md
재개 방법: 새 대화에서 /next-step (사용자가 아래 대기 항목을 처리한 뒤 재개 권장)

## Phase 1 Task 체크
- [x] T1 모노레포 골격 (2026-07-20 완료)
- [x] T2 core 도메인 계약 v1 (2026-07-20 완료, 계약 잠금됨 — Todo/Memo/Profile/DuckState 변경은 병렬 구간 밖에서만)
- [x] T3 디자인 토큰 + ui 기초 (2026-07-20 완료, apps/web에도 적용됨)
- [x] T4 Supabase 스키마 v1 + RLS — 마이그레이션 SQL 작성 완료(supabase/migrations, supabase/rollback). **적용은 Supabase 프로젝트 생성 후 사용자 실행**
- [x] T5 Auth (Google + GitHub) — 코드 작성 완료(로그인 화면, OAuth 콜백, 세션 proxy.ts, 로그아웃, profiles 자동생성 트리거). **실기기 검증은 OAuth 앱 등록 + 환경변수 설정 후 가능**
- [x] T6 CI/CD — GitHub Actions(.github/workflows/ci.yml: build+lint+test) 작성 완료, Vercel Analytics 연결 완료.
  **GitHub 저장소 생성+push 완료** (https://github.com/ohjungs/little-dev-duck, main 브랜치).
  **CI 그린 확인 완료** (run 29714759669, build/lint/test 전부 통과 — 최초 시도는 Node 20 고정 탓에 pnpm 11(node>=22.13 요구)과 충돌해 실패했고, node-version:22로 수정 후 재통과).
  **Vercel 프로젝트 연결은 사용자 실행 필요** (vercel CLI 로그인은 브라우저 인증이라 대행 불가).
  Sentry는 계정 미생성으로 [미해결] 이월

전 Task의 코드/설정 파일은 로컬에 존재하고 `pnpm build && pnpm lint && pnpm test` 전부 통과 확인됨.
단, 실제 로그인/배포 동작 확인은 아래 "차단/대기 항목"을 사용자가 처리해야 가능하다.
그 전까지는 Phase 1 DoD(로그인 화면, 배포 URL 반영 등)를 최종 확인할 수 없으므로 Phase 완료 처리는 보류한다.

## 차단/대기 항목 (사용자 수행, 순서대로)

1. Supabase 프로젝트 생성 -> `supabase link` -> `supabase db push` (절차: supabase/README.md)
2. Google Cloud OAuth 클라이언트 + GitHub OAuth App 등록, Supabase Auth Provider/URL 설정 (절차: docs/setup/oauth-setup.md)
3. `apps/web/.env.local` 값 채우기 (`.env.example` 참고)
4. Vercel 프로젝트 연결(브라우저 로그인 필요) + 환경변수 등록 (절차: docs/setup/deploy-setup.md — GitHub 연결은 이미 완료됨)
5. 위 완료 후 docs/plans/phase_01.md의 "검증 체크리스트" 5개 항목 사용자 실행 -> 결과를 다음 세션에 공유하면 Phase 1 종료 절차(/review, History.md 갱신) 진행

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 (Phase 3 전까지)
- Sentry 연동 [미해결, 이월] — 절차는 docs/setup/deploy-setup.md 5절
