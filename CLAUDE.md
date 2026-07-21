# CLAUDE.md — LDD (Little Dev Duck)

이 문서는 이 저장소에서 작업하는 모든 Claude Code 세션이 반드시 먼저 읽어야 하는 규범이다.
설계 원본은 docs/ARCHITECTURE.md와 docs/DECISIONS.md에 있다. 이 문서와 충돌하면 이 문서가 우선한다.

## 1. 제품 한 줄 정의

3D 아기오리 AI 비서가 상주하는 개인 워크스페이스.
위젯 모드(오리 + 투두 + 메모 + 커밋 잔디)와 앱 모드(노션급 블록 에디터)를 오가며,
오리는 RAG 기반으로 사용자의 데이터를 알고 답하고, 외부 서비스에 실제 작업을 수행하는 에이전트다.

## 2. 확정 스택 (변경은 사고 게이트 재통과 필수)

- 프론트: Next.js(App Router) + TypeScript, BlockNote, react-three-fiber
- 백엔드: Supabase (Auth Google+GitHub / Postgres+RLS / pgvector / Storage / Realtime)
- AI: Gemini API 무료 티어 (키는 서버 env 전용, 클라이언트 노출 금지)
- 데스크톱: Tauri 2 (배포된 Vercel URL을 WebView로 로드 — 옵션 A, ARCHITECTURE.md 1절.
  Rust 사이드 = Claude Code 로그 수집기)
- 배포: Vercel (git push = 배포), GitHub Actions (lint/test). Tauri Release 파이프라인은
  설치 바이너리 배포가 필요해지는 시점(Phase 13 근처)에 재도입
- 모노레포: pnpm + Turborepo
- 모바일: React Native (최종 단계, core/api/ai만 공유)

## 3. 개발 원칙

### 3-1. 워크플로 3축
- STDD: 테스트 명세를 먼저 쓰고 구현한다.
- ponytail (full 모드 상시): 코드를 쓰기 전 7단계 사다리를 탄다.
  필요한가 - 코드베이스에 있나 - 표준 라이브러리 - 플랫폼 네이티브 - 설치된 의존성 - 한 줄 - 최소 구현.
  검증, 에러 처리, 보안, 접근성은 절대 깎지 않는다.
- gstack: 계획은 /office-hours - /autoplan, 리뷰는 /review, 배포는 /ship, 회고는 /retro.

### 3-2. PDCA 에이전트 팀
- Plan: Planner가 docs/plans/phase_xx.md와 Task 의존성 그래프를 만든다.
- Do: Implementer N개가 병렬 구현한다. 아래 병렬 규칙을 따른다.
- Check: Reviewer(/review + /ponytail-review) + QA(/qa).
- Act: /ship, /retro, History.md와 Status.md 갱신.

### 3-3. 병렬 규칙 (위반은 blocking)
- 패키지 경계 = 에이전트 경계. 담당 패키지 밖 파일 수정 금지.
- 계약(core 타입, zod 스키마, DB 마이그레이션, API Route 인터페이스)이 잠긴 뒤에만 병렬 시작.
- 계약 변경은 병렬 구간 밖에서만 허용한다.
- 병렬은 git worktree 분리 세션으로, 동시 2~3개를 상한으로 한다.
- 구현 중 설계 결함 발견 시 몰래 고치지 말고 STOP. 보고 후 게이트로 되돌린다.

### 3-4. 모델 운용
기본 구현은 Sonnet. 아키텍처 변경, 계약 재설계 수준의 난제만 사용자에게 물어본 뒤 상위 모델로 전환한다.

### 3-5. 의존 방향 (import 규칙)
apps/* -> packages/ui, mascot, ai -> packages/api -> packages/core
core는 아무것도 import하지 않는다. 역방향 import는 blocking.
공통 기능은 packages에 이미 있는지 먼저 찾는다. 재구현은 인벤토리 위반이며 최고 심각도.

## 4. Review-Learning Loop (2단계 도입)

전체 정의는 docs/review-learning-loop.md 참조. 현재 단계:

- 1단계 (지금): 저장 구조(docs/lessons-learned.md, docs/anti-patterns/, docs/reviews/)와
  /review 커맨드만 운용. 트리거는 Phase 완료 시 수동 1회.
- 2단계 (Phase 4~5 승격): 로컬 스케줄러가 headless Claude Code로 일일 배치 실행.
  GitHub Actions 기반 배치는 유료 API가 필요하므로 채택하지 않는다 (무료 원칙).

경계 규칙: lessons-learned에는 실제 버그와 REF-HIGH 이상만.
docs/reviews/는 immutable. 배포 차단은 SEC- 등급만으로 판정한다.

## 5. 안전 규칙

- 되돌리기 어려운 작업(삭제, DDL, 외부 발송, 덮어쓰기)은 실행 전 사용자 확인.
- 모든 DB 마이그레이션은 down 스크립트를 동반한다.
- Gmail 어댑터의 영구삭제는 설계상 금지. 휴지통 이동만, 그것도 사용자 승인 후.
- 시크릿(.env)은 커밋 금지. 서버 전용 키는 API Route 뒤에만 둔다.

## 6. 표기 규칙

- 응답과 문서는 한국어, 기술 용어는 원어 유지. 이모지 금지.
- 주석은 코드로 알 수 없는 제약에만 쓰고, 형식은 YYYY-MM-DD : 대분류 - 중분류 - 소분류.
- 사실/추측 구분: [확인됨] / [추정] / [가정](+확인 방법). 미검증 항목은 보고 말미에 명시.

## 7. 커맨드

- /next-step : Status.md 확인 - 현 Phase 계획 진행 - 완료 시 History.md 기록 (.claude/commands/next-step.md)
- /review : 리뷰 하네스 실행 (.claude/commands/review.md)
- gstack, ponytail 플러그인 설치가 선행돼야 한다:
  /plugin marketplace add DietrichGebert/ponytail 후 /plugin install ponytail@ponytail
  gstack은 저장소 README 절차대로 ~/.claude/skills/gstack 설치.

## 8. 현재 상태

현재 Phase와 진행 현황은 docs/Status.md 참조 (이 절은 갱신하지 않는다 — Status.md가 단일 출처).
노션 대비 격차 분석과 개발 지시서: docs/plans/notion-gap-analysis-2026-07-21.md.
