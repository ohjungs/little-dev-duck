# OAuth 앱 등록 안내 (Google + GitHub)

Phase 1 T5. 아래 항목은 계정 소유자만 수행할 수 있어 자동화하지 않는다.
완료 후 apps/web/.env.local(.env.example 참고)과 Supabase 대시보드에 값을 채운다.

## 0. 공통 정보

- Supabase 콜백 URL: `https://<project-ref>.supabase.co/auth/v1/callback`
  (`<project-ref>`는 Supabase 프로젝트 설정 > API 페이지에서 확인)
- 로컬 개발 origin: `http://localhost:3000`
- 배포 origin: `https://<vercel-domain>` (Vercel 연결 후 확정, T6 참고)

## 1. Google Cloud Console

1. https://console.cloud.google.com/ 에서 프로젝트 생성(또는 기존 프로젝트 선택)
2. "APIs & Services" > "OAuth consent screen" 설정 (User Type: External, 앱 이름/이메일만 최소 입력)
3. "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs: 위 "Supabase 콜백 URL" 그대로 추가
4. 발급된 **Client ID**, **Client Secret**을 Supabase 대시보드 > Authentication > Providers > Google에 입력, 활성화

## 2. GitHub OAuth App

1. https://github.com/settings/developers > "OAuth Apps" > "New OAuth App"
2. Homepage URL: 배포 origin (임시로 로컬 origin 사용 가능, 배포 후 수정)
3. Authorization callback URL: 위 "Supabase 콜백 URL" 그대로 입력
4. 발급된 **Client ID**, **Client Secret**을 Supabase 대시보드 > Authentication > Providers > GitHub에 입력, 활성화

## 3. Supabase Auth 설정

Authentication > URL Configuration에서:

- Site URL: 배포 origin
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://<vercel-domain>/auth/callback` 둘 다 추가

## 4. 앱 환경변수

`apps/web/.env.local` 생성 후 (`.env.example` 복사):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase 대시보드 API 페이지의 anon public key>
```

Vercel 배포 시 동일한 값을 Vercel 프로젝트 환경변수에도 등록한다 (T6에서 안내).

## 5. 검증 (STDD, 위 설정 완료 후 사용자 실행)

1. 미로그인 상태로 `/` 접속 -> `/login`으로 리다이렉트되는지 확인
2. `/login`에서 Google 로그인 -> Supabase 콜백 -> `/`로 복귀, "환영합니다" 문구와 이름 표시 확인
3. Supabase 대시보드 Table Editor > profiles에 본인 1행이 자동 생성됐는지 확인
4. GitHub 로그인도 동일하게 확인
5. 새로고침 후에도 로그인 상태가 유지되는지 확인
6. 로그아웃 버튼 클릭 -> `/login`으로 이동, 다시 `/` 접속 시 재로그인 요구되는지 확인
