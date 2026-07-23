# LDD — Little Dev Duck

안경 쓴 아기오리 AI 비서가 상주하는 개인 워크스페이스. 위젯 모드(오리 + 투두 + 메모 + 커밋 잔디)와
앱 모드(노션급 블록 에디터)를 오가며, 오리는 RAG로 내 데이터를 알고 답하고 외부 서비스에 실제 작업을
수행하는 에이전트다.

- **스택**: Next.js(App Router) · Supabase(Auth/Postgres+RLS/pgvector/Storage/Realtime) · BlockNote ·
  react-three-fiber · Tauri 2 · Gemini · Vercel
- **모노레포**: pnpm + Turborepo
- **개발 원칙**: STDD(테스트 우선) + ponytail(최소 구현) + gstack(워크플로) + 전 구간 무료 티어
- **프로덕션**: Vercel (`git push origin main` = 배포), 저장소 `github.com/ohjungs/little-dev-duck`

---

## 🖥 다른 컴퓨터에서 풀받아 이어서 작업하기 (Quick Start)

### 1. 요구사항
| 도구 | 버전/비고 |
|---|---|
| Node.js | **≥ 22.13** (CI는 Node 22). nvm 권장 |
| pnpm | 최신 (`npm i -g pnpm` 또는 corepack) |
| Git | — |
| GitHub CLI(`gh`) | CI 상태 확인용(권장) |
| Supabase CLI | `supabase db push`(마이그레이션 적용)용. `npx supabase`로도 가능 |
| (선택) Rust + Tauri CLI | `apps/desktop`(데스크톱 위젯) 빌드 시에만 |

### 2. 클론 + 설치
```bash
git clone https://github.com/ohjungs/little-dev-duck.git
cd little-dev-duck
pnpm install            # 루트에서 워크스페이스 전체 설치
```

### 3. 환경변수 (로컬 개발용)
`apps/web/.env.example` 를 `apps/web/.env.local` 로 복사하고 값을 채운다(`.env.local`은 커밋 금지):
```bash
cp apps/web/.env.example apps/web/.env.local
```
| 키 | 출처 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 대시보드 → Settings → API |
| `GEMINI_API_KEY` | Google AI Studio(무료 티어). RAG·에이전트·에디터 AI 작문 보조가 사용 |
| `GITHUB_TOKEN` | GitHub PAT(잔디/이슈용) |
| `CRON_SECRET` | (선택) 뉴스 수집 엔드포인트 보호. 로컬엔 없어도 됨 |

> 프로덕션 값은 Vercel 프로젝트 env에 이미 등록돼 있음. 로컬은 위 파일로 별도 주입.

### 4. Supabase 연결 + 마이그레이션 적용 ⭐ (다음 세션 최우선)
DB 스키마가 있어야 대부분 기능이 동작한다. 프로젝트 `--project-ref=iupprzfmlyfrdcctdupn`:
```bash
supabase login                       # 최초 1회 (SUPABASE_ACCESS_TOKEN 발급)
supabase link --project-ref iupprzfmlyfrdcctdupn
supabase db push                     # supabase/migrations 미적용분 적용 (down은 supabase/rollback)
```
**미적용 대기 4건**(적용해야 신규 기능 실기 검증 가능): `pages_db_view`, `pages_public_share`,
`delete_all_my_data`, `news`. 상세는 `docs/Status.md` 최상단 인계 절.
※ `db push`는 되돌리기 어려운 DDL이라 **사용자가 직접** 실행한다(자율 세션은 이월만 함).

### 5. 개발 서버 / 검증
```bash
pnpm dev                             # 전체(turbo). 웹만: pnpm --filter web dev → http://localhost:3000
pnpm test                            # 전 패키지 vitest
pnpm lint                            # 전 패키지 eslint (로컬 web eslint는 느림 → 백그라운드 권장)
pnpm build                           # 전 패키지 프로덕션 빌드
```

---

## ✅ 검증 워크플로 (push 전 필수)
- **패키지 빌드(tsc)는 vitest와 별개다.** core 계약(zod 스키마 등)을 바꾸면 다른 패키지의 테스트 픽스처가
  tsc에서 깨져 **CI만 red**가 될 수 있다(2026-07-24 실제 발생). push 전 **전 패키지 tsc**를 돌려라:
  ```bash
  for p in @ldd/core @ldd/api @ldd/ai @ldd/mascot; do pnpm --filter $p exec tsc --noEmit; done
  pnpm --filter web exec tsc --noEmit
  pnpm --filter web exec eslint .    # 느림 → 백그라운드
  ```
- `next build`는 타입체크는 하지만 ESLint는 안 돈다 → build GREEN ≠ lint GREEN. 별도 lint 필수.
- CI(`.github/workflows/ci.yml`): `lint-and-test`(build+lint+test) + `e2e`(Playwright). `git push origin main`이
  CI와 Vercel 배포를 트리거한다.

---

## 📁 모노레포 구조
```
apps/
  web/         Next.js 앱(App Router). 대부분의 UI·API Route·페이지
  desktop/     Tauri 2 데스크톱 위젯(배포된 web URL을 WebView 로드 + Rust 로그 수집기)
packages/
  core/        순수 도메인·스키마·순수함수(zod). 무엇도 import 안 함(플랫폼 중립, lib=ES2022)
  api/         Supabase 접근·Gemini 호출 등(core에 의존)
  ai/          AI 클라이언트 로직(api에 의존)
  ui/, mascot/ 공용 UI·오리 마스코트
supabase/      migrations/ + rollback/ + config.toml
docs/          CLAUDE 규범·설계·계획·현황(아래 문서 지도)
```
**import 방향**: `apps/* → ui/mascot/ai → api → core` (역방향 금지). 자세한 규칙은 `CLAUDE.md` 3-5.

---

## 🤖 Claude Code로 이어서 개발하기
1. **진입점**: 모든 세션은 `CLAUDE.md`(저장소 규범)를 먼저 읽는다.
2. **플러그인 설치**(머신마다 1회, `~/.claude`에 설치되므로 새 컴퓨터에서 재설치 필요):
   - ponytail: `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail`
   - gstack: 저장소 README 절차대로 `~/.claude/skills/gstack` 설치
3. **재개**: 새 대화에서 `/next-step` (또는 자율 루프 `/loop /next-step`).
   - `/next-step`은 `docs/Status.md`를 읽어 현재 Phase/미완료 Task를 파악하고 이어간다.
   - **현재 진행 상황과 다음 우선순위는 `docs/Status.md` 최상단 "⏭ 다음 세션 이어서 하기" 절**에 정리돼 있음.
4. **MCP**: `.mcp.json`이 Supabase MCP 서버를 설정한다. 셸 env에 `SUPABASE_ACCESS_TOKEN`을 설정해야 동작.

---

## 📌 현재 상태 (요약)
- Phase 1~17 로드맵 슬라이스 + 노션-격차 후속 기능 다수 구현·배포됨(2026-07-24 `/loop` 세션서 32개 기능 추가 배포).
- **다음 최우선 = 위 4단계의 `supabase db push`**(미적용 4건). 적용 후 실기 검증 → 다음 차수.
- 전체 현황·이력·다음 항목: `docs/Status.md`, `docs/History.md`.

## 🗺 문서 지도
| 문서 | 역할 |
|---|---|
| `CLAUDE.md` | 개발 규범(모든 세션 진입점) |
| `docs/Status.md` | **현재 진행 현황 + 다음 세션 인계**(최상단) |
| `docs/History.md` | 진행 이력 |
| `docs/DECISIONS.md` | 확정 의사결정 대장 |
| `docs/ARCHITECTURE.md` | 구조도 + 스키마 골격 + 로드맵 |
| `docs/plans/notion-gap-analysis-2026-07-21.md` | 노션 격차 분석(남은 기능 우선순위 소스) |
| `docs/plans/phase_01~17.md` | Phase별 계획 |
| `docs/review-learning-loop.md` | 자가 학습 리뷰 루프 |
