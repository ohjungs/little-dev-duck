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

**갱신(2026-07-21, `/next-step`)**: **T1(Tauri 스캐폴딩) 완료.** `apps/desktop` 신설, WebView가
Vercel 배포 URL을 로드하도록 구성, always-on-top 위젯 창 설정, `cargo build` 전체 컴파일 성공.
상세는 아래 T1 절 참조 — 위젯 창의 실제 화면 렌더링은 이 세션 환경에서 시각적으로 확인하지 못해
사용자 검증 필요. T2(Rust 수집기)/T4(검증)는 아직 미착수.

**갱신(2026-07-21, `/next-step` 계속)**: **T2(Rust 로그 수집기) 완료.** Rust `collect_claude_logs`
+ `collector://progress`, 원격 origin 권한 스코프(`capabilities/remote.json` +
`permissions/default.toml`), `packages/core`/`packages/api`에 activity_daily 스키마·업서트 함수,
`apps/web`에 Tauri 감지 동기화 컴포넌트까지 연결 완료. 전체 `pnpm build`/`lint`/`test` 통과(5/5,
9/9, 8/8). 실제 로그인 상태에서 위젯 실행 → `activity_daily` 반영까지의 end-to-end 확인은 이
세션에서 못함(T1과 같은 GUI 검증 한계) — T4에서 사용자 확인 필요. 남은 건 T4(통합 검증)뿐.

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

### T1. apps/desktop — Tauri 2 스캐폴딩 — 완료 (2026-07-21)
- [x] `tauri init --ci`로 스캐폴딩(`apps/desktop/src-tauri`), pnpm-workspace `apps/*` 패턴에 자동 편입
- [x] WebView는 Vercel 배포 URL(`https://web-sepia-one-88.vercel.app`)을 로드 — `tauri.conf.json`의
  `build.frontendDist`/`build.devUrl`을 로컬 경로 대신 그 URL로 직접 설정(Tauri 2가 공식 지원하는
  방식, 별도 프론트엔드 번들 없음). `identifier`는 `dev.littledevduck.desktop`, CSP는 기본값(null,
  비활성) 유지 — Tauri IPC를 아직 안 쓰므로(T2에서 필요해지면 `capabilities/`에 원격 도메인 권한
  추가 예정)
- [x] 상시 위젯 창(always-on-top) 설정 — `app.windows[0].alwaysOnTop: true`, 크기는 800x600 기본값
  대신 세로형 위젯에 맞게 360x640으로 조정(스펙에 명시 안 된 값이라 판단 근거로 기록 — 필요시 조정)
  - 투명 활보 모드는 Phase 6 스코프 제외(YAGNI)
- **부수 수정**: `apps/desktop/package.json`의 스크립트명을 `dev`/`build`가 아닌 `tauri:dev`/
  `tauri:build`로 명명 — 그대로 뒀다면 루트 `pnpm build`(= `turbo run build`, CI의 `lint-and-test`
  잡이 실행)가 `tauri build`까지 실행하려다 Rust 없는 `ubuntu-latest` 러너에서 깨졌을 것. `.github/
  workflows/ci.yml`은 다른 세션이 다루는 파일이라 직접 건드리지 않고, desktop 쪽 스크립트명만
  바꿔 turbo가 자동으로 스킵하도록 회피(CI 워크플로 자체는 무변경 — Tauri Release 빌드는 DECISIONS.md
  1절이 원래도 별도 GitHub Actions job으로 예정해뒀던 항목)
- **검증**: `cargo build`(PATH에 `~/.cargo/bin` 재확인 필요 — 이 세션 bash가 방금 설치된 Rust
  PATH를 자동 인식하지 못함, 매 호출마다 `export PATH="$HOME/.cargo/bin:$PATH"` 명시 필요)로 전체
  의존성 컴파일 성공(dev profile, 첫 빌드 ~20분). 빌드된 `app.exe`를 직접 실행해 프로세스가 크래시
  없이 살아있고 `Responding=True` 상태임을 확인(스모크 테스트) — 단, `MainWindowHandle`이 0으로
  잡혀 **위젯 창이 실제로 화면에 렌더링되는지는 이 환경에서 시각적으로 확인 불가**
  [추정: 이 에이전트 세션에 상호작용 가능한 desktop/window station이 없을 가능성]. Phase 3
  마스코트 GUI, 로그인 페이지 오리 로고와 동일하게 빌드 통과까지만 확인, 실제 렌더링은 사용자
  검증 필요(T4에서 재확인 권장).

### T2. Rust 사이드 — Claude Code 로그 수집기 — 완료 (2026-07-21)
- [x] `collect_claude_logs` invoke 핸들러: `~/.claude/projects/**/*.jsonl` 스캔, 날짜별 세션
      존재만 집계(원문 파싱/전송 금지 - 프라이버시 원칙) — `apps/desktop/src-tauri/src/collector/
      mod.rs`. **구현 방식**: 파일 내용은 전혀 읽지 않고 각 `.jsonl`의 수정 시각(mtime)만으로
      날짜를 판정. DECISIONS.md #9-2는 "timestamp 필드를 로컬 파싱"까지는 허용했지만, 더 보수적으로
      파일 내용을 아예 열지 않는 쪽을 택함(프라이버시 여유폭 확보, 구현도 더 단순). 트레이드오프:
      세션이 여러 날에 걸치면 마지막 활동일로만 집계되는 근사치.
      **code-reviewer 발견(2026-07-21) 및 수정**: 최초 구현이 UTC 기준으로 날짜를 매겨 KST
      사용자가 자정 넘어(예: 00:30) 작업하면 "어제" 날짜로 잘못 집계되는 HIGH 버그가 있었음 —
      `time::UtcOffset::current_local_offset()`(로컬 오프셋 조회 실패 시 UTC로 안전하게 대체)로
      수정. 핵심 로직(`session_date`, `find_session_files`) 단위 테스트 5개 추가(`cargo test` 통과) —
      최초 구현엔 Rust 쪽 테스트가 0건이었던 것도 함께 지적받아 보완.
- [x] `collector://progress` 이벤트로 진행 상황 프론트에 전달 — 스캔한 파일마다 `emit`,
      `apps/web`의 `DesktopCollectorSync`가 `listen`해서 "동기화 중 (n/m)" 트랜지언트 텍스트로 표시
      (스캔이 보통 1초 이내라 완료 후에는 아무 것도 안 보임)
- [x] 집계 결과를 Supabase `activity_daily`(source=claude_code)에 업로드 — **Rust가 직접 Supabase에
      접속하지 않는다** (ARCHITECTURE.md 3절 인터페이스 (3)+(1) 조합: Rust는 로컬 집계만 만들어
      invoke 반환값으로 넘기고, 실제 업로드는 이미 로그인된 웹 세션이 있는 WebView/JS 쪽에서
      `packages/api`의 `upsertActivityDaily`(신규, supabase-js upsert `onConflict: user_id,date,
      source`)로 수행). Rust 바이너리에 Supabase 자격 증명을 전혀 넣지 않아도 되는 구조.

**추가 구현물**:
- `packages/core/src/domain/activity-daily.ts` — `activityDailyEntrySchema`(date/source/count)
- `packages/api/src/activity.ts` — `upsertActivityDaily`(로그인 필요, RLS `user_id=auth.uid()` 준수)
- `apps/web/src/components/DesktopCollectorSync.tsx` — `window.__TAURI__` 존재 여부로 데스크톱 실행
  감지(브라우저에서는 완전히 no-op), 마운트 시 1회 수집기 호출 후 업로드. `@tauri-apps/api`를
  apps/web의 의존성으로 추가하지 않기 위해 `tauri.conf.json`의 `app.withGlobalTauri: true`로 주입된
  전역 객체를 타입 캐스팅으로 사용(웹/데스크톱 공용 코드베이스 원칙 유지)
- `apps/desktop/src-tauri/capabilities/remote.json` + `permissions/default.toml` — 배포된 Vercel
  origin에 `collect_claude_logs` 커맨드와 이벤트 리스닝만 최소 권한으로 허용(다른 Tauri 코어 API는
  차단)... **는 원래 의도였으나, security-reviewer가 설치된 tauri 2.11.5 크레이트 소스를 직접 읽어
  실제로는 그렇게 동작하지 않는다는 걸 확인함(2026-07-21, HIGH)**: `tauri.conf.json`의
  `frontendDist`/`devUrl`을 Vercel URL 그 자체로 지정했기 때문에, Tauri의 `is_local_url()`이 이
  origin을 "Remote"가 아니라 "Local"(로컬 앱 그 자체)로 판정한다(`tauri-2.11.5/src/webview/mod.rs`
  확인). 그 결과 `remote.json`의 `remote.urls` 스코핑 분기는 사실상 실행되지 않고, 대신 두
  capability 모두의 `local: true` 기본값(`tauri-utils-2.9.3/src/acl/capability.rs`)으로 권한이
  적용된다 — `default.json`의 `core:default`(창 조작/이벤트 등 코어 명령 전체)까지 이 origin에
  통째로 부여된다는 뜻. **"이 origin에만 최소 권한"이라는 설계 의도와 실제 동작이 다르다.**
  다행히 `fs`/`shell`/`http`/`dialog` 플러그인이 전혀 없어(Cargo.toml에 미포함) 블라스트 반경은
  제한적이지만, capability 파일 자체는 여기서는 추가 방어선이 아니라는 걸 정확히 인지하고 있어야
  한다. 옵션 A(배포 URL을 frontendDist로 직접 로드) 구조를 유지하는 한 이 한계는 구조적이라
  고치지 않음 — 대신 아래 CSP를 실질적 방어선으로 삼는다.

**보안 리뷰 후속 조치(2026-07-21, HIGH 2건)**:
1. 위 capability 스코핑 무효화 — 별도 수정 없이 문서화로 대응(구조적 한계, 위 참조).
2. `security.csp: null`도 이 구조에서 완전히 무효임을 확인 — Tauri는 `data:` 스킴에만 CSP를
   주입하는데(`tauri-2.11.5/src/manager/webview.rs`) 이 앱은 `https://` 원격 콘텐츠를 로드해서
   그 경로를 아예 타지 않는다. 게다가 `apps/web`에는 CSP/보안 헤더가 전혀 없어서 웹이든
   데스크톱이든 XSS 방어선이 하나도 없던 상태 — `apps/web/src/proxy.ts`(Next.js 미들웨어)에
   CSP(`script-src 'self'`, nonce 없이도 인라인 스크립트 차단 — 이 코드베이스가 next/script
   외 인라인 스크립트를 안 쓰기 때문에 가능한 선택) + `X-Content-Type-Options`/`X-Frame-Options`/
   `Referrer-Policy`/`Permissions-Policy`/`Strict-Transport-Security`를 추가해 실질적 방어선을
   마련함. **구현 중 발견한 Next.js 함정**: 응답 객체에 `.headers.set()`만 하면 X-Frame-Options
   등 대부분은 살아남지만 CSP/HSTS만 App Router 렌더 단계에서 사라진다(실측 확인) — Next 공식
   가이드대로 요청 헤더(`NextResponse.next({ request: { headers } })`)에도 같이 실어야 최종
   응답까지 전달된다. `pnpm --filter web dev` + curl로 `/login` 응답에 6개 헤더 전부 포함됨을
   실측 확인, 페이지 본문도 정상 렌더링됨(제목 태그 정상, 15KB 응답) — 단 실제 브라우저에서 CSP
   위반으로 콘솔 에러가 뜨는지(예: 예상 못한 인라인 스크립트/스타일 로드)까지는 이 세션 환경에서
   확인 못해 사용자 브라우저 검증을 권장.

**미검증**: `pnpm --filter desktop tauri:dev`로 실제 실행해 위젯이 로그인 상태에서 자동으로
`activity_daily`를 채우는지는 이 세션 환경(GUI 시각 확인 불가, T1 절 참조)에서 end-to-end로 확인
못함 — Rust 컴파일+테스트 통과(권한 스키마 검증 포함) + TS 빌드/린트/테스트 통과까지만 확인. 사용자가
실제 로그인 후 실행해 Supabase `activity_daily` 테이블에 오늘 날짜 행이 생기는지, 그리고 새 CSP가
브라우저에서 실제 페이지 동작을 깨지 않는지 확인 필요(T4).

**리뷰에서 나왔지만 이번 라운드에서 고치지 않은 항목(MEDIUM/LOW, 후속 과제로 남김)**: symlink
미검증(`find_session_files`), `upsertActivityDaily`의 `updated_at` 미갱신, `DesktopCollectorSync`
동기화 실패 시 사용자에게 보이는 에러 상태 없음, `upsertActivityDaily` 입력단 zod 검증 부재,
`count` 상한 없음, `capabilities/default.json`의 실효성 재검토.

### T3. supabase/migrations — activity_daily 테이블 — 완료 (2026-07-21, /loop 자동 진행)
- [x] `date, source(github|claude_code), count, user_id` + RLS(`user_id = auth.uid()`) —
  `supabase/migrations/20260721000000_activity_daily.sql`, `(user_id, date, source)` unique 추가(Rust
  수집기가 upsert할 것을 고려)
- [x] down 스크립트 동반(CLAUDE.md 5장 원칙) — `supabase/rollback/20260721000000_activity_daily_down.sql`

**프로덕션 적용 완료(2026-07-21, `/next-step`, 사용자 명시 승인)**: 실사용 검증 중 `activity_daily`가
프로덕션 Supabase에 없어(anon key로 REST 프로브 시 HTTP 404 `PGRST205`) 데스크톱 위젯의 업로드가
조용히 실패하던 것을 발견 — T4 잔여 항목의 실제 블로커였음. `npx supabase migration list --linked`로
5개는 원격 적용됨/`activity_daily`만 미적용(`remote:""`)임을 확인(히스토리 동기화 상태라 재적용
충돌 없음), `supabase db push --linked`로 이 하나만 적용. 적용 후 REST 프로브가 HTTP 200으로 전환됨을
독립 확인. 이 머신에 Claude 로그 `.jsonl` 2251개 존재 확인(수집기가 집계할 데이터 있음).

### T4. 검증 — 부분 완료(창 렌더링은 이 세션에서 실측 확인, 로그인 필요 항목은 사용자 검증 대기)

- [x] Tauri 앱 빌드/실행, 위젯 창 표시 확인 — **완료(2026-07-21)**. `pnpm --filter desktop tauri:dev`로
  직접 실행 후 PowerShell로 프로세스 실측: `MainWindowTitle: "Little Dev Duck"`,
  `MainWindowHandle: 4067222`(0이 아님), `Responding: True`. WebView2 자식 프로세스가 여럿 기동되고
  메인 렌더러 WorkingSet이 137MB까지 증가(콘텐츠 로드 정황), `Get-DnsClientCache`에
  `web-sepia-one-88.vercel.app` 해석 기록 확인(WebView가 실제로 배포 URL에 접속 시도했다는 증거).
  **정정**: T1 절의 "이 에이전트 세션에 상호작용 가능한 desktop/window station이 없을 가능성" 추정은
  틀렸음 — 이 세션은 `SessionId=1`(Console, `UserInteractive=True`)의 실제 인터랙티브 데스크톱에서
  실행되고 있었다. 픽셀 스크린샷은 시도했으나 PowerShell의 `Add-Type`+화면 캡처 패턴을 백신이
  악성으로 오탐해 차단(`CopyFromScreen` 관련 스크립트 두 종류 모두 차단됨) — 무리하게 우회하지
  않음. 검증 후 프로세스는 정리(`Stop-Process`)했다.
  curl로 CSP 등 6개 보안 헤더가 `/`(303 리다이렉트)와 `/login` 응답 모두에 실제로 실려있음도
  재확인(`connect-src`에 `*.supabase.co` 포함, `script-src 'self'`만 허용).
- [ ] 로그 수집기 실행 -> activity_daily에 오늘 날짜 집계 반영 확인 — **사용자 검증 필요**.
  `DesktopCollectorSync`는 홈(`/`)에서만 마운트되고 홈은 `proxy.ts` 인증 게이트 뒤에 있어(비로그인
  시 `/login`으로 303 리다이렉트, curl로 실측 확인), 실제 Google/GitHub 로그인 없이는 수집기 호출
  자체가 일어나지 않는다. 로그인은 사용자 자격 증명이 필요해 이 세션이 대신할 수 없음.
- [ ] 웹에서도 같은 데이터 확인(위젯-웹 데이터 공유 원칙 검증) — 위 항목과 동일한 사유로 **사용자
  검증 필요**.

**실사용 중 발견 및 수정(2026-07-21, 사용자가 위젯에서 실제 로그인 시도 중 발견)**: 사용자가
위젯(Tauri WebView2 DevTools)에서 로그인 페이지를 열자 `script-src`가 모든 스크립트를 차단하는
CSP 위반이 콘솔에 대량으로 발생 — 로그인 자체가 완전히 깨짐. 근본 원인 조사 결과 두 단계 버그였음:
1. (1차) `script-src 'self'`가 nonce 없이 Next.js가 자체 삽입하는 RSC 하이드레이션 인라인
   스크립트까지 막고 있었음 — nonce 기반 CSP(`buildCsp(nonce)`, request/response 헤더 양쪽에
   실어 Next가 자동으로 스크립트에 붙이게 함)로 전환(커밋 `4de6028`). 로컬 검증까지는 통과했으나
   배포 후 사용자가 재현한 에러가 여전히 남아있어 원인이 더 있었음을 발견.
2. (근본 원인) `/login`이 **정적 프리렌더링** 페이지였음(`next build` 출력에 `○ /login`,
   `X-Nextjs-Prerender: 1` 헤더로 확인) — 빌드 시점에 한 번 구워진 HTML의 스크립트 nonce가
   매 요청마다 새로 발급되는 CSP 헤더 nonce와 영원히 일치할 수 없는 구조적 문제였음. Next.js
   공식 문서: nonce 기반 CSP는 동적 렌더링에서만 유효. `login/page.tsx`를 서버 컴포넌트로 남기고
   `export const dynamic = "force-dynamic"` 추가, 실제 UI는 `login/LoginForm.tsx`(client)로
   분리해 해결(커밋 `accc4e3`). 빌드 출력에서 `/login`이 `○`→`ƒ`로 전환된 것 확인, 로컬 dev와
   프로덕션 양쪽에서 연속 두 번 요청 시 nonce가 매번 다르게 발급되고 매번 body의 script 태그와
   정확히 일치함을 curl로 실측 확인(`X-Nextjs-Prerender` 헤더도 프로덕션에서 사라짐,
   `X-Vercel-Cache: MISS` + `Cache-Control: private, no-cache`로 더 이상 캐시되지 않음을 확인).
   Vercel 자동 배포로 반영 완료.
   **교훈**: CSP 새로 도입 시 정적/동적 라우트별로 각각 실제 브라우저에서 확인해야 한다 -
   `curl`의 헤더 값만으로는(nonce가 매번 다르게 나온다는 사실 자체는 정상으로 보여서) 이 버그를
   놓치기 쉽다. 사용자의 실제 위젯 실행이 아니었으면 발견하지 못했을 것.

**로그인 후속 실사용 발견 및 수정(2026-07-21, 로그인 성공 뒤 잔디 미표시)**: 로그인은 되는데
GitHub 잔디가 안 떠서 조사 — 두 건이 겹쳐 있었음:
1. `GET /api/github/contributions` 500 — Vercel에 `GITHUB_TOKEN` 환경변수가 미등록이라
   `route.ts`가 500을 반환(Phase 4 검증 체크리스트 1번 항목이 실제로 미이행 상태였음). 사용자가
   Vercel 대시보드에 토큰 등록 + 재배포로 해소.
2. 잔디 격자가 떠도 빈 칸이 안 보이던 문제 — `GithubContributionWidget`의 셀 색이
   `color-mix(accent 0%, surface)` = 순수 `--ldd-color-surface`인데 `Card` 배경도 같은 토큰이라
   기여 0개 칸이 카드에 통째로 녹아 사라짐. 레벨별 mix 최소값을 0%→12%로 올려 GitHub 원본처럼
   빈 칸도 옅게 보이게 수정(커밋 `42b637f`).

**activity_daily 프로덕션 적용(2026-07-21, `/next-step`, 사용자 명시 승인)**: 위 T3 절 참조 —
테이블이 프로덕션에 없어서 위젯의 업로드가 조용히 실패하던 것을 발견하고 `supabase db push`로
적용, REST 프로브 200 전환 확인. **이로써 T4 잔여 2항목을 막던 인프라 블로커(로그인 불가, 토큰
미등록, 테이블 부재)는 전부 해소됨** — 남은 건 사용자가 위젯에서 로그인해 실제로 행이 쌓이는지
확인하는 E2E 한 번뿐이다(수집기 코드/테이블/업로드 함수는 모두 검증됨).

**사용자 검증 절차(남은 2항목, 모든 인프라 블로커 해소됨)**:
1. `pnpm --filter desktop tauri:dev`로 위젯 실행 (또는 아무 브라우저로 배포 URL 접속도 동일 검증 가능)
2. Google 또는 GitHub 계정으로 로그인
3. 브라우저 개발자 도구 콘솔에 CSP 위반 에러가 없는지 확인(특히 로그인 콜백 이후 홈 화면)
4. Supabase 대시보드 `activity_daily` 테이블에서 오늘 날짜, `source=claude_code`, 본인 `user_id` 행이
   생겼는지 확인
5. 웹 브라우저로 같은 계정 로그인 후 홈 화면에서 같은 데이터가 보이는지 확인(위젯 전용 데이터가
   아님을 검증)

## 하지 않는 것 (이번 Phase 제외)

- 투명 활보 모드(바탕화면 돌아다니기) - Phase 6
- GitHub 소스와 Claude Code 소스를 합친 통합 잔디 위젯 - 필요해지면 별도 판단
- Claude Code 원문 로그 업로드 - 설계상 영구 금지, 집계만
