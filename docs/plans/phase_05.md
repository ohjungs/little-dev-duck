# Phase 5 — Tauri 위젯 + Claude Code 수집기

작성일 2026-07-20, `/next-step` Pre-flight 조사 중 초안 작성. **착수 전 블로커 2건 발견 — 구현 시작
전에 반드시 해소 필요.** CLAUDE.md 3-3 "설계 결함 발견 시 STOP" 원칙에 따라 구현하지 않고 여기서 멈춤.

**갱신(2026-07-20, /loop-start 준비 세션)**: 블로커 2(아키텍처 결정)는 사용자 확정으로 해소됨 —
옵션 A(배포된 웹 URL 로드) 채택, ARCHITECTURE.md 1절 + DECISIONS.md #9-11 갱신 완료. T3(Supabase
마이그레이션)는 Rust와 무관해 먼저 진행 완료.

**갱신(2026-07-21, 설치 세션)**: **블로커 1(Rust 툴체인)도 해소됨.** 사용자 요청으로 이 세션이
직접 설치 진행 — rustup으로 Rust(stable-x86_64-pc-windows-msvc, rustc 1.97.1) 설치, VS Build Tools
2022(C++ 워크로드 + Windows 11 SDK) 설치. 중간에 네트워크 단절로 설치가 멈춰 재시작했고, 강제
종료 여파로 Windows Installer가 일시적으로 뮤텍스 충돌(에러 1618)을 일으켰으나 재시도로 자연
해소됨(재부팅 불필요). `cargo new` + `cargo build`로 실제 MSVC 빌드까지 성공해 툴체인 전체
동작을 실측 검증했다 — `vswhere`의 `isComplete` 플래그는 여전히 `false`로 나오지만(설치 후
상태 캐시 갱신 지연으로 추정, [추정]) 실제 컴파일이 되므로 무시해도 된다. **T1/T2/T4 착수 가능
— 다음 세션에서 실제 구현 진행 예정(사용자 지시: "실제 개발은 다음 세션에서").**

## 블로커 1 — Rust 툴체인 미설치 (사용자 조치 필요)

이 머신에 `cargo`/`rustc`가 없다(실측: `command -v cargo` 실패). Tauri 2는 Rust로 네이티브 셸을
빌드하므로 필수. 설치 절차(사용자 액션, 자동화 불가 — 시스템 전역 툴체인 설치):

1. https://rustup.rs 에서 rustup 설치 (Windows는 `winget install Rustlang.Rustup` 또는 설치 스크립트)
2. Windows는 MSVC 빌드 도구 필요: "Desktop development with C++" 워크로드가 포함된
   Visual Studio Build Tools ([확인 필요] 이미 설치돼 있을 수도 있음 - `winget list` 등으로 실측)
3. `cargo --version`으로 설치 확인 후 재개

## 블로커 2 — "Next.js static export" 설계 전제가 현재 아키텍처와 충돌 (해소됨, 2026-07-20)

ARCHITECTURE.md 1절/3절은 Tauri WebView가 "Next.js static export"를 탑재한다고 명시한다
(Phase 1 설계 시점 결정). 그런데 Phase 1~4를 거치며 앱은 다음을 갖추게 됐다:

- `apps/web/src/proxy.ts` — Next.js Middleware 기반 인증 게이트(Edge 런타임 필요)
- `apps/web/src/app/page.tsx`, `login/page.tsx` — 서버 컴포넌트(`await createClient()`,
  `redirect()`) — 정적 export가 지원하지 않는 서버 렌더링
- `apps/web/src/app/api/github/contributions/route.ts` — Next.js API Route(서버리스 함수 필요,
  `GITHUB_TOKEN` 같은 서버 전용 시크릿을 여기 뒤에 숨김)
- `apps/web/src/app/auth/callback/route.ts`, `auth/logout/route.ts` — 마찬가지로 API Route

**`next build && next export`(정적 export)는 Middleware, 서버 컴포넌트의 서버 로직, API Route를
전부 지원하지 않는다.** 즉 현재 상태로는 Tauri에 정적 export를 그대로 탑재할 수 없다 — 로그인
게이트도, GitHub 잔디 API도, 향후 Gemini 프록시(Phase 8+)도 전부 서버가 있어야 동작하는데
정적 파일에는 서버가 없다.

### 검토한 대안 (사고 게이트에서 결정 필요, 아직 결정 안 함)

| 옵션 | 내용 | 장점 | 단점 |
|---|---|---|---|
| A. 배포된 웹 URL을 그대로 로드 | Tauri WebView가 `https://web-sepia-one-88.vercel.app`를 가리킴 - "네이티브 창을 씌운 웹앱" | 서버 로직 100% 재사용, 버전 스큐 없음(웹 배포와 항상 동기화), 구현량 최소 | 오프라인 완전 불가(원래도 Supabase 의존이라 사실상 온라인 전제였음), 정적 export라는 원 설계 문서와 문구가 어긋남(문서 갱신 필요) |
| B. Next.js를 Node 서버 모드로 두고 Tauri가 로컬에서 그 서버를 실행 | `next start`를 Tauri sidecar 프로세스로 기동, WebView는 `localhost` 접속 | 오프라인 캐시 여지, "로컬 앱"에 더 가까움 | Node 런타임을 앱에 번들해야 함(용량↑), 배포/업데이트 파이프라인 복잡도 큼, 무료 티어 원칙과도 거리 있음 |
| C. 정적 export 유지 + 인증/API 의존 기능은 데스크톱에서 제외 | 위젯 모드만 정적으로, 로그인 필요한 기능은 "웹에서 보기" 링크로 우회 | 원 설계 문서와 형식적으로 일치 | 사실상 Phase 2~4에서 만든 기능 대부분을 데스크톱에서 못 씀 - 위젯의 존재 의미가 옅어짐 |

**옵션 A로 확정(2026-07-20, 사용자 승인)** — 무료 티어 원칙·최소 구현 원칙과 부합. ARCHITECTURE.md
1절, DECISIONS.md #9-11 갱신 완료. 상세 사유는 DECISIONS.md #9-11 참조.

## 확정된 것 (Pre-flight 실측 완료)

- **Claude Code 로그 경로/포맷** 실측 완료(DECISIONS.md #9-2 해소): `~/.claude/projects/<slug>/
  <session-uuid>.jsonl`, JSON Lines, `slug`는 작업 디렉터리 절대경로의 구분자/콜론을 `-`로 치환.
  수집기는 날짜별 세션 존재/프로젝트만 집계하면 되고 원문은 로컬에만 남긴다.
- `activity_daily` 테이블은 Phase 4에서 의도적으로 보류했던 테이블 - 이번 Phase에서 만든다
  (source: `github` | `claude_code`, Phase 4의 실시간 GitHub 조회도 이 시점에 이 테이블로
  옮길지는 별도 판단 - 우선은 claude_code 소스만 채우고 GitHub는 그대로 실시간 유지해도 무방,
  두 소스를 합쳐 보여줄 위젯이 필요해지는 시점에 재검토).

## Task (블로커 해소 후 착수)

### T0. 블로커 해소 (직렬, 계약 잠금 전 필수) — 완료 (2026-07-21)
- [x] Rust 툴체인 설치 확인 — rustc 1.97.1 + VS Build Tools(MSVC) 설치, `cargo build` 실컴파일로 검증
- [x] 정적 export vs 대안(A/B/C) 결정 - 옵션 A, ARCHITECTURE.md 갱신 완료 (2026-07-20)

### T1. apps/desktop — Tauri 2 스캐폴딩 (계약 잠금) — 착수 가능(다음 세션)
- [ ] `pnpm create tauri-app` 또는 수동 스캐폴딩, 모노레포 워크스페이스 편입
- [ ] WebView는 Vercel 배포 URL(`https://web-sepia-one-88.vercel.app`)을 로드(옵션 A 확정)
- [ ] 상시 위젯 창(always-on-top) 설정 - 투명 활보 모드는 Phase 6 스코프 제외(YAGNI)

### T2. Rust 사이드 — Claude Code 로그 수집기
- [ ] `collect_claude_logs` invoke 핸들러: `~/.claude/projects/**/*.jsonl` 스캔, 날짜별 세션
      존재만 집계(원문 파싱/전송 금지 - 프라이버시 원칙)
- [ ] `collector://progress` 이벤트로 진행 상황 프론트에 전달
- [ ] 집계 결과를 Supabase `activity_daily`(source=claude_code)에 업로드

### T3. supabase/migrations — activity_daily 테이블 — 완료 (2026-07-21, /loop 자동 진행)
- [x] `date, source(github|claude_code), count, user_id` + RLS(`user_id = auth.uid()`) —
  `supabase/migrations/20260721000000_activity_daily.sql`, `(user_id, date, source)` unique 추가(Rust
  수집기가 upsert할 것을 고려)
- [x] down 스크립트 동반(CLAUDE.md 5장 원칙) — `supabase/rollback/20260721000000_activity_daily_down.sql`

아직 실제 Supabase 프로젝트에 `supabase db push`로 적용되지는 않았다(다른 마이그레이션과 동일하게
사용자 확인 후 적용 — supabase/README.md 참조). T1/T2/T4는 Rust 블로커 해소로 착수 가능해짐.

### T4. 검증
- [ ] Tauri 앱 빌드/실행, 위젯 창 표시 확인
- [ ] 로그 수집기 실행 -> activity_daily에 오늘 날짜 집계 반영 확인
- [ ] 웹에서도 같은 데이터 확인(위젯-웹 데이터 공유 원칙 검증)

## 하지 않는 것 (이번 Phase 제외)

- 투명 활보 모드(바탕화면 돌아다니기) - Phase 6
- GitHub 소스와 Claude Code 소스를 합친 통합 잔디 위젯 - 필요해지면 별도 판단
- Claude Code 원문 로그 업로드 - 설계상 영구 금지, 집계만
