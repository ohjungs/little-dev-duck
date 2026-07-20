# 배포 연결 안내 (Vercel + GitHub)

Phase 1 T6. GitHub 원격 저장소 생성/push와 Vercel 프로젝트 연결은 계정 소유자 액션이라 자동화하지 않는다.

## 1. GitHub 원격 저장소

현재 로컬 저장소(`master` 브랜치)에 원격이 연결돼 있지 않다.

```bash
gh repo create little-dev-duck --public --source=. --remote=origin
git push -u origin master
```

(DECISIONS.md 결정: 공개 모노레포)

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
