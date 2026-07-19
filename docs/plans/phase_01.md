# Phase 1 — 코어 기반 (Core Foundation)

작성일 2026-07-19. 사고 게이트 통과 완료 (결정 대장: docs/DECISIONS.md).
목표: 이후 모든 Phase가 올라탈 모노레포 골격, 도메인 계약, 인증, 배포 파이프라인을 세운다.
이 Phase는 모든 것이 상호 의존하므로 병렬 없이 단일 세션 직렬로 진행한다.

## 완료 정의 (Definition of Done)

- ldd.vercel.app(또는 자동 부여 도메인)에서 Google/GitHub 로그인 후 "로그인됨" 화면이 뜬다.
- git push만으로 배포되고, PR에서 lint와 테스트가 자동 실행된다.
- packages/core의 도메인 타입과 Supabase 스키마 v1이 일치하며, RLS로 타인 데이터 접근이 차단된다.
- 오리 팔레트 기반 라이트/다크 토큰이 packages/ui에 존재하고 화면에 적용된다.

## Task 목록 (50% 룰: Task 단위로 쪼개 진행, 순서 고정)

### T1. 모노레포 골격
- [ ] pnpm workspace + Turborepo 초기화, apps/web(Next.js) + packages/core,api,ui 빈 패키지
- [ ] TypeScript strict, ESLint, Prettier 공통 설정
- [ ] Next.js는 static export 호환 구조 유지 (Tauri 탑재 대비, 서버 기능은 API Route로 한정)
- STDD 명세: `pnpm build`와 `pnpm lint`가 루트에서 전 패키지 통과. web이 core의 더미 타입을 import해 렌더.

### T2. core 도메인 계약 v1
- [ ] Todo, Memo, Profile, DuckState의 타입 + zod 스키마
- [ ] 계약 문서화: 각 필드의 의미와 제약을 스키마 주석이 아닌 타입 정의로 표현
- STDD 명세: zod parse 단위 테스트 - 정상값 통과, 경계값(빈 제목, 최대 길이 초과, 잘못된 날짜) 거부.
- 주의: 이 Task 완료 = 계약 잠금. 이후 변경은 병렬 구간 밖에서만.

### T3. 디자인 토큰 + ui 기초
- [ ] 오리 팔레트(#F6EFDD, #E3D3B9, #A99C65, #352116) 기반 라이트/다크 토큰 (CSS 변수)
- [ ] 기본 컴포넌트 3종만: Button, Card, Input (ponytail: 지금 필요한 것만)
- STDD 명세: 토큰 스냅샷 테스트, 다크 전환 시 배경/텍스트 대비 확인 시나리오.

### T4. Supabase 스키마 v1 + RLS
- [ ] 프로젝트 생성, profiles/todos/memos/duck_state 마이그레이션 + down 스크립트
- [ ] 전 테이블 RLS: user_id = auth.uid()
- STDD 명세: 계정 A로 넣은 todo를 계정 B 세션으로 select 시 0건. down 실행 후 재-up 멱등 확인.
- 안전: DDL이므로 적용 전 마이그레이션 파일을 사용자에게 보고하고 확인받는다.

### T5. Auth (Google + GitHub)
- [ ] Google Cloud / GitHub OAuth 앱 등록 절차 문서화 (사용자 수행 항목 분리)
- [ ] 로그인 화면, 세션 유지, 로그아웃, profiles 자동 생성 트리거
- STDD 명세: 미로그인 시 보호 라우트 접근 -> 로그인 화면. 로그인 후 profiles 1행 생성. 새로고침 후 세션 유지.

### T6. CI/CD
- [ ] Vercel 연결 (push=배포), GitHub Actions: PR에서 lint + test
- [ ] Sentry, Vercel Analytics 무료 티어 연결은 이 Task에 포함하되 실패 시 [미해결]로 이월
- STDD 명세: 의도적 lint 오류 PR이 빨간불, 수정 후 초록불. main push 후 배포 URL 반영 확인.

## 하지 않는 것 (이번 Phase 제외)

오리 렌더링, 투두 화면 로직, Tauri, AI, 에디터 전부. T2의 타입 정의까지만이 이번 범위다.
packages/mascot, ai와 apps/desktop 디렉터리는 만들지 않는다 (빈 껍데기 선제 생성 금지 - ponytail 1번).

## 검증 체크리스트 (Phase 종료 시 사용자 실행)

1. `pnpm install && pnpm build && pnpm test` - 전부 통과
2. 배포 URL 접속 - 랜딩 없이 로그인 화면 - Google 로그인 - 환영 화면에 이름 표시
3. Supabase 대시보드에서 profiles에 본인 1행 확인
4. 시크릿 브라우저에서 보호 라우트 직접 접근 - 로그인으로 리다이렉트
5. PR 하나 열어 CI 동작 확인

## 리스크와 대응

- [가정] Supabase 무료 프로젝트 리전/생성 제한 - 착수 시 실측, 문제 시 보고 후 진행
- OAuth 등록은 사용자 계정 작업이라 자동화 불가 - T5에서 단계별 안내 문서를 먼저 산출
- 계약 v1이 이후 Phase에서 흔들리면 재작업 비용 큼 - T2에서 duck_state 등 미래 필드는
  최소로만 넣고 확장은 마이그레이션으로 (선제 설계 금지)

## 종료 절차

/review 수동 1회 실행 - 발견 사항을 docs/reviews/에 기록 - History.md 체크박스 갱신
- Status.md를 Phase 2 대기로 전환 - 다음 대화는 /next-step으로 재개.
