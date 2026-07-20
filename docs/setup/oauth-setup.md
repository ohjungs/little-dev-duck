# OAuth 앱 등록 안내 (Google + GitHub)

Phase 1 T5. 아래 항목(Google Cloud / GitHub OAuth App 등록)은 계정 소유자만 브라우저에서
할 수 있는 작업이라 자동화하지 않는다. 그 외(Supabase 프로젝트/DB/Auth URL 설정, env 값 반영,
Vercel 연결)는 이미 완료되어 있다.

## 0. 공통 정보 — 확정됨

- Supabase 프로젝트: `iupprzfmlyfrdcctdupn` (서울 리전)
- Supabase 콜백 URL: `https://iupprzfmlyfrdcctdupn.supabase.co/auth/v1/callback`
- 배포 origin: `https://web-sepia-one-88.vercel.app`
- 로컬 개발 origin: `http://localhost:3000` (또는 3001, 3000 사용 중이면 자동 대체)
- Supabase Auth Site URL / Redirect URLs: `supabase/config.toml` + `supabase config push`로 이미 반영 완료

## 1. Google Cloud Console — 사용자 수행 필요

1. https://console.cloud.google.com/ 에서 프로젝트 생성(또는 기존 프로젝트 선택)
2. "APIs & Services" > "OAuth consent screen" 설정 (User Type: External, 앱 이름/이메일만 최소 입력)
3. "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: `https://iupprzfmlyfrdcctdupn.supabase.co/auth/v1/callback`
4. 발급된 **Client ID**, **Client Secret**을 Supabase 대시보드 > Authentication > Providers > Google에 입력, 활성화
   (https://supabase.com/dashboard/project/iupprzfmlyfrdcctdupn/auth/providers)

## 2. GitHub OAuth App — 사용자 수행 필요

1. https://github.com/settings/developers > "OAuth Apps" > "New OAuth App"
2. Homepage URL: `https://web-sepia-one-88.vercel.app`
3. Authorization callback URL: `https://iupprzfmlyfrdcctdupn.supabase.co/auth/v1/callback`
4. 발급된 **Client ID**, **Client Secret**을 Supabase 대시보드 > Authentication > Providers > GitHub에 입력, 활성화

## 3. 앱 환경변수 — 완료됨

`apps/web/.env.local`과 Vercel 프로젝트(Production/Preview/Development) 양쪽에
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 이미 설정되어 있다.

## 4. 검증 (STDD, 위 OAuth 등록 완료 후 사용자 실행)

1. 미로그인 상태로 https://web-sepia-one-88.vercel.app 접속 -> `/login`으로 리다이렉트 확인 (완료, curl로 검증됨)
2. `/login`에서 Google 로그인 -> Supabase 콜백 -> `/`로 복귀, "환영합니다" 문구와 이름 표시 확인
3. Supabase 대시보드 Table Editor > profiles에 본인 1행이 자동 생성됐는지 확인
4. GitHub 로그인도 동일하게 확인
5. 새로고침 후에도 로그인 상태가 유지되는지 확인
6. 로그아웃 버튼 클릭 -> `/login`으로 이동, 다시 `/` 접속 시 재로그인 요구되는지 확인
