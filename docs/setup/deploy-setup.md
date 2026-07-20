# 배포 연결 안내 (Vercel + GitHub)

Phase 1 T6. Vercel 프로젝트 연결은 브라우저 로그인이 필요한 계정 소유자 액션이라 자동화하지 않는다.

## 1. GitHub 원격 저장소 — 완료

https://github.com/ohjungs/little-dev-duck (main 브랜치, 공개 저장소, DECISIONS.md 결정대로).
`gh repo create`로 생성 + push, CI 1회 성공 확인까지 완료됨(2026-07-20).

## 2. GitHub Actions

`.github/workflows/ci.yml`이 이미 추가되어 있다. push/PR을 열면 자동으로
`pnpm install && pnpm build && pnpm lint && pnpm test`를 실행한다. 별도 설정 불필요.

## 3. Vercel 연결

1. https://vercel.com/new 에서 위 GitHub 저장소 Import
2. Root Directory: `apps/web` 지정
3. Framework Preset: Next.js (자동 감지)
4. Environment Variables에 `docs/setup/oauth-setup.md`의 값 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy — 이후 해당 GitHub 저장소로 push할 때마다 자동 배포된다.
6. 배포 URL을 `docs/setup/oauth-setup.md`의 "Redirect URLs"와 Supabase "Site URL"에 반영한다.

## 4. Vercel Analytics

`@vercel/analytics`가 이미 apps/web에 설치되어 `layout.tsx`에 연결돼 있다.
Vercel에 배포되면 별도 키 설정 없이 자동으로 수집된다 (대시보드 > Analytics 탭에서 확인).

## 5. Sentry — [미해결, 이월]

Sentry는 계정 생성 + 프로젝트 DSN 발급이 선행돼야 한다. Phase 1 범위에서는
계정을 만들 수 없어 연결을 보류한다. 필요 시 아래 절차로 추가한다:

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
```

DSN 발급 후 `apps/web/.env.local`에 `NEXT_PUBLIC_SENTRY_DSN` 추가, Vercel 환경변수에도 등록.

## 6. 검증 (STDD, 위 설정 완료 후 사용자 실행)

1. 의도적으로 lint 에러(예: 미사용 변수)를 포함한 PR을 연다 -> Actions가 빨간불(실패)
2. 에러 수정 후 push -> Actions가 초록불(성공)
3. `main` 브랜치에 push -> Vercel 배포 URL에 변경 사항이 반영되는지 확인

## 7. Supabase MCP (선택, 스키마 확인·마이그레이션 검증용) — 2026-07-20 추가

루트 `.mcp.json`에 Supabase MCP 서버(`@supabase/mcp-server-supabase`)를 `--read-only` +
`--project-ref=iupprzfmlyfrdcctdupn`로 설정해뒀다. 콘솔 수작업 대신 코드/마이그레이션 파일로
스키마를 확인·검증하려는 용도이며, 읽기 전용이라 이 MCP로는 스키마를 변경할 수 없다(변경은 항상
`supabase/migrations`의 up+down 스크립트로만 한다).

동작시키려면 계정 소유자가 아래를 수행해야 한다(자동화 불가 — 브라우저 로그인 필요한 계정 액션):

1. https://supabase.com/dashboard/account/tokens 에서 Personal Access Token 발급
   (계정 전체 권한이므로 취급 주의 — `--project-ref`로 이 MCP 서버 자체는 해당 프로젝트로 제한됨)
2. 셸 프로필(`~/.bashrc`, `~/.zshrc` 등)에 등록, 커밋 금지:
   ```bash
   export SUPABASE_ACCESS_TOKEN="발급받은 토큰"
   ```
3. Claude Code를 재시작하면 `.mcp.json`이 자동 로드된다.

미설정 상태로 둬도 다른 기능에는 영향 없음(선택 사항). GitHub MCP는 별도로 구성하지 않았다 —
`gh` CLI가 이미 설치돼 있어 이슈/PR 작업은 CLI를 우선 사용한다(2026-07-20-1st_Fut_list.md MCP
활용 지침과 동일한 결정). Figma/Gmail/Notion/Google Drive/Adobe/Canva는 이 프로젝트가 아니라
claude.ai 커넥터 설정으로 이미 연결되어 있어 `.mcp.json`에 중복 등록하지 않았다.

## 8. GitHub 잔디 API 환경변수 (Phase 4) — 2026-07-20 추가

`/api/github/contributions`가 GitHub GraphQL API로 컨트리뷰션 캘린더(공개 데이터)를 조회한다.
공개 데이터 조회라 스코프가 필요 없으므로 scope 미선택 Classic PAT 1개면 충분하다(근거는
docs/plans/phase_04.md "착수 전 확인" 참조).

1. https://github.com/settings/tokens 에서 "Generate new token (classic)" 선택,
   scope는 아무것도 체크하지 않고 발급(공개 정보 읽기 전용).
2. `apps/web/.env.local`에 `GITHUB_TOKEN=발급받은 토큰` 추가(커밋 금지, .gitignore로 이미 제외됨).
3. Vercel 프로젝트 Environment Variables에도 동일하게 `GITHUB_TOKEN` 등록 후 재배포.

미설정 상태에서도 앱은 죽지 않는다 — 위젯이 에러 상태(재시도 버튼)로 표시된다.
