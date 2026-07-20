# Status.md — 현재 Phase 진행 현황

현재 Phase: 1 (코어 기반) — 코드/인프라 전부 구축 완료, **Google/GitHub OAuth 앱 등록만 남음**
계획 문서: docs/plans/phase_01.md
재개 방법: 새 대화에서 /next-step

## Phase 1 Task 체크
- [x] T1 모노레포 골격 (2026-07-20 완료)
- [x] T2 core 도메인 계약 v1 (계약 잠금됨 — Todo/Memo/Profile/DuckState 변경은 병렬 구간 밖에서만)
- [x] T3 디자인 토큰 + ui 기초 (apps/web에도 적용됨)
- [x] T4 Supabase 스키마 v1 + RLS — **완료**. 프로젝트 `iupprzfmlyfrdcctdupn`(서울) 생성,
  마이그레이션 5개(profiles/todos/memos/duck_state + RLS + profiles 트리거) 적용 완료.
- [x] T5 Auth (Google + GitHub) — 코드 완료 + 배포 후 curl로 `/login` 리다이렉트 동작 확인.
  **남은 것: Google Cloud OAuth 클라이언트 + GitHub OAuth App 등록** (브라우저 전용, 절차: docs/setup/oauth-setup.md 1~2절)
- [x] T6 CI/CD — **완료**. GitHub Actions 그린(run 29714759669), Vercel Analytics 연결,
  Vercel 프로젝트(`5555jungs-5168s-projects/web`) 생성 + Root Directory=apps/web 설정 +
  프로덕션 배포 확인(https://web-sepia-one-88.vercel.app, `/` -> `/login` 리다이렉트 정상).
  **남은 것: Vercel 프로젝트 설정 페이지에서 "Connect Git Repository"** (push 자동배포용, git으로는 아직 미연결 — CLI 수동 배포로는 됨)
  Sentry는 계정 미생성으로 [미해결] 이월

## 남은 차단 항목 (사용자만 가능, 브라우저 작업)

1. **Google Cloud OAuth 클라이언트 등록** — 절차: docs/setup/oauth-setup.md 1절
2. **GitHub OAuth App 등록** — 절차: docs/setup/oauth-setup.md 2절
   (1, 2 완료 후 Supabase 대시보드 Authentication > Providers에 Client ID/Secret 입력)
3. Vercel 프로젝트 설정(https://vercel.com/5555jungs-5168s-projects/web/settings/git)에서
   "Connect Git Repository" — 지금은 `vercel deploy`로 수동 배포만 되고, push 시 자동배포는 안 됨
4. 위 완료 후 docs/setup/oauth-setup.md 4절의 검증 체크리스트 실행 (실제 로그인 -> profiles 자동생성 확인)
5. 검증 결과를 다음 세션에 공유하면 Phase 1 종료 절차(/review, History.md 갱신, Phase 2 계획) 진행

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 (Phase 3 전까지)
- Sentry 연동 [미해결, 이월] — 절차는 docs/setup/deploy-setup.md 5절
