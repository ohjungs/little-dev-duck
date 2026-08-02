# 사용자 설정 절차서 (2026-08-01)

> 제가 못 하는 것(외부 대시보드 로그인·시크릿 입력·육안 확인)만 모았다.
> 각 항목은 **어디서 · 무엇을 · 어떻게 확인** 세 가지를 갖춘다.
> 배포 주소: `https://web-sepia-one-88.vercel.app`

---

## 1. Vercel 환경변수 `SUPABASE_SERVICE_ROLE_KEY` — 계정 삭제 켜기

### 1-1. 키 복사 (Supabase)

1. https://supabase.com/dashboard → 프로젝트 `iupprzfmlyfrdcctdupn` 선택
2. 왼쪽 아래 **Project Settings**(톱니) → **API Keys**
3. `service_role` 키의 **Reveal** → 복사
   - 대시보드 개편으로 **Legacy API keys** 탭 아래에 있을 수 있다. `eyJ...`로 시작하는
     긴 JWT가 맞는 값이다.
   - 옆의 `anon`/`publishable` 키가 **아니다.** 이건 RLS를 통째로 우회하는 키다.

### 1-2. Vercel에 넣기

1. https://vercel.com → 프로젝트 **web** → **Settings** → **Environment Variables**
2. Key: `SUPABASE_SERVICE_ROLE_KEY` / Value: 붙여넣기
3. Environments: **Production** 체크(Preview는 선택 — 체크하면 프리뷰 배포에서도 계정 삭제가 켜진다)
4. **Sensitive**로 저장(값이 다시 안 보이게 — 권장)

**`NEXT_PUBLIC_` 접두를 절대 붙이지 않는다.** 붙이면 브라우저 번들에 그대로 실려 나가고,
그 키 하나로 전체 DB가 열린다. 붙어 있으면 저장소 테스트가 실패하도록 잠가 뒀다.

### 1-3. 재배포 (필수)

환경변수는 **배포 시점에 묶인다** — 넣기만 하면 지금 돌고 있는 배포는 모른다.
Vercel → **Deployments** → 맨 위 배포 → 오른쪽 `...` → **Redeploy**.

### 1-4. 확인

배포된 사이트 로그인 → **설정** 화면 → 맨 아래 **위험 구역** 카드에 버튼이 **두 개**면 켜진 것이다:
"모든 데이터 삭제"(항상 있음) + **"계정까지 영구 삭제"**(키가 있을 때만 렌더된다).

누르면 확인 문구 **`계정을 영구 삭제`** 를 정확히 타이핑해야 진행된다(콘텐츠 삭제의
"삭제합니다"와 일부러 다르게 해 뒀다 — 손이 기억한 대로 눌러 계정까지 지우는 걸 막는다).

**2026-08-01 실측 확인**: 전용 테스트 계정으로 프로덕션에 로그인해 설정 화면을 캡처했고,
"계정까지 영구 삭제" 버튼이 렌더되는 것을 확인했다 = 키 설정 완료.

---

## 2. Vercel 환경변수 `CRON_SECRET` — keepalive 잠그기

### 2-1. 값은 새로 만들 필요 없다

`apps/web/.env.local`에 **이미 `CRON_SECRET` 값이 있다**(로컬에만 있고 커밋되지 않는다).
그 값을 그대로 Vercel에 넣으면 로컬과 프로덕션이 일치한다.

새로 만들고 싶으면 (PowerShell):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2-2. 넣기

Vercel → **web** → Settings → Environment Variables →
Key `CRON_SECRET` / Value 위 값 / Environments **Production** → 저장 → **Redeploy**.

### 2-3. 크론은 안 깨진다

`apps/web/vercel.json`에 크론이 등록돼 있다(`/api/keepalive`, 매일 06:00 UTC = 한국 15:00).
Vercel Cron은 `CRON_SECRET`이 있으면 `Authorization: Bearer <값>` 헤더를 **자동으로** 실어
보낸다. 즉 값을 넣는 순간 크론만 통과하고 나머지는 막힌다.

### 2-4. 확인

브라우저로 `https://web-sepia-one-88.vercel.app/api/keepalive` 접속:

- 지금(미설정): `{"ok":true,...}` — 누구나 호출 가능
- 설정 후: `{"error":"unauthorized"}` (401) — 잠긴 것

---

## 3. Vercel Web Analytics 켜기

1. Vercel → 프로젝트 **web** → 상단 **Analytics** 탭
2. **Enable** 클릭 (Hobby 플랜 무료 제공, 월 이벤트 상한 있음)

코드는 손댈 게 없다 — `<Analytics />`가 이미 모든 페이지에 붙어 있다
(`apps/web/src/app/layout.tsx:69`). 프로젝트에서 꺼져 있어 스크립트가 404였을 뿐이다.

**재배포는 필요 없다**(설정 플래그라 즉시 반영). [추정 — 켠 뒤 아래로 확인]

### 확인

배포 사이트에서 F12 → Network → 새로고침 → `/_vercel/insights/script.js`가 **200**이면 켜진 것
(지금은 404). 통계는 켠 시점부터 쌓이고 **과거분은 복구되지 않는다.**

---

## 4. Supabase 비밀번호 정책

### 4-1. 위치

Supabase 대시보드 → **Authentication** → **Sign In / Providers** → **Email** 펼치기

- **Minimum password length**: 기본 6 → **8 이상** 권장(공식 문서도 8 미만 비권장)
- **Password Requirements**: 드롭다운에서 필요한 문자 조합 선택
  (숫자+영문 소문자·대문자·기호까지 요구할수록 강해진다)

### 4-2. 유출 비밀번호 차단은 무료 플랜에서 불가

**Leaked password protection**(HaveIBeenPwned 대조)은 **Pro 플랜 이상**이다(공식 문서 확인).
무료 티어 원칙(`CONSTRAINTS_FREE_TIER.md`)상 지금은 켤 수 없다 — 어드바이저가 이걸 계속
지적해도 정상이다.

### 4-3. 알아 둘 것

정책을 올려도 **기존 비밀번호는 그대로 남는다.** 다음에 바꿀 때부터 적용된다.
그리고 이 정책은 서버가 강제하므로, 화면 문구는 그대로 두면 서버 오류 문구가 뜬다 —
정책을 정하시면 가입 화면 안내 문구를 그 값에 맞춰 제가 고치겠다.

---

## 5. CI에서 로그인 뒤 e2e 돌리기 — 권장 경로가 바뀌었다

### 5-1. 왜 바뀌었나

문서가 안내하던 `E2E_AUTH_STATE_B64`(세션 파일을 base64로 등록)는 **세션이 만료되면 다시
만들어 등록해야 한다.** 그런데 2026-07-31에 **이메일 로그인 자동화**가 들어왔다 —
`globalSetup`이 테스트 계정 이메일·비밀번호로 **매 실행마다 직접 로그인**한다. 만료가 없다.

로컬 `.env.local`에는 이미 `E2E_EMAIL`·`E2E_PASSWORD`(전용 테스트 계정)가 들어 있다.

### 5-2. 할 일 — GitHub 시크릿 2개

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret** 를 두 번:

| 이름 | 값 |
|---|---|
| `E2E_EMAIL` | `apps/web/.env.local`의 `E2E_EMAIL` 값 |
| `E2E_PASSWORD` | 같은 파일의 `E2E_PASSWORD` 값 |

**CI 워크플로에 이 두 값을 받는 단계는 아직 없다** — 제가 `ci.yml`에 배선해야 한다.
등록해 주시면 그 커밋을 올린다. (미등록이 안전한 기본값이라 그때까지는 지금처럼 스킵된다.)

### 5-3. 켜기 전에 알아야 할 것

켜면 **매 푸시마다 실제 프로덕션 Supabase에** 투두·메모를 만들고 지운다.
테스트가 정리하지만 실패하면 잔여 데이터가 남을 수 있다 — 그래서 전용 테스트 계정을 쓴다
(이미 분리돼 있다). 본인 계정 자격증명은 넣지 않는다.

---

## 6. Sentry 계정 만들기 (결정 7번 — 가이드 요청분)

### 6-1. 가입

1. https://sentry.io/signup/ — GitHub 계정으로 가입 가능
2. 플랜: **Developer(무료)** — 월 5천 에러, 1명. 이 프로젝트엔 충분하다
3. 조직 이름은 아무거나(예: `little-dev-duck`)

### 6-2. 프로젝트 생성

1. **Create Project**
2. Platform: **Next.js**
3. Alert frequency 기본값, 프로젝트 이름 `ldd-web`

### 6-3. DSN 복사

생성 직후 화면, 또는 **Settings → Projects → ldd-web → Client Keys (DSN)** 에서
`https://<키>@o0000.ingest.sentry.io/0000` 형태의 값을 복사.

### 6-4. 저에게 주실 것

DSN 하나면 된다. **DSN은 클라이언트에 노출되는 값이라** 시크릿이 아니지만,
그래도 대화창에 붙이는 대신 Vercel 환경변수에 직접 넣으시는 편이 낫다:

- `NEXT_PUBLIC_SENTRY_DSN` = 위 DSN (이건 `NEXT_PUBLIC_`이 **맞다** — 브라우저 에러를 보내야 한다)

넣으셨다고 알려 주시면 제가 SDK 배선 + **PII 스크러빙**(이메일·페이지 본문·토큰이 에러
리포트에 실려 나가지 않게)을 구현한다. 스크러빙 없이 켜면 개인 문서 내용이 외부 서비스로
나갈 수 있어 그 부분이 이 작업의 핵심이다.

---

## 7. 습관 체크박스 저장 실패 — 문구 한 줄만 (mv 118)

### 7-1. 절차

1. 배포 사이트에서 **강력 새로고침**(Ctrl+Shift+R — 옛 번들이 남아 있으면 옛 오류가 뜬다)
2. 대시보드 → 습관 위젯 → 체크박스 클릭
3. 화면에 뜨는 **빨간 문구를 그대로** 알려주기

### 7-2. 문구별 원인 (미리 갈라 둔다)

| 뜨는 문구 | 원인 | 조치 |
|---|---|---|
| "로그인이 필요합니다" | 세션 만료 | 로그아웃 후 재로그인이면 끝 |
| `new row violates row-level security` | RLS 정책 | 제가 실서버 정책을 다시 본다 |
| `duplicate key ... habit_checks` | 같은 날 중복 체크 | 토글(해제) 경로 결함 — 제가 고친다 |
| `function award_xp ... does not exist` | 권한/함수 | 제가 실서버에서 재확인 |
| 아무 문구도 안 뜨는데 상태만 원복 | 낙관적 UI 되돌림 | 콘솔(F12) 빨간 줄을 알려주기 |

서버 쪽은 이미 실서버를 직접 조회해 전부 정상임을 확인했다(RLS 3종 · UNIQUE 제약 ·
`award_xp` 실행권한 · `duck_state` 행 누락 0건 · `onChange` 배선). 그래서 **문구가 곧 답**이다.

---

## 8. 눈으로 봐 주실 화면 4개

전부 로그인 뒤 화면이라 제가 볼 수 없다. 이상하면 번호만 알려주시면 된다.

| # | 어디 | 볼 것 |
|---|---|---|
| 99 | 뉴스 화면 상단 | 이슈 카드 10장 + `진행 n/10`이 뜨는가 (이번에 기사 이미지도 붙었다) |
| 102 | 대시보드 | "오늘의 뉴스" 위젯이 10개 목록이고 높이가 과하지 않은가 |
| 105 | 새 페이지 → 템플릿 | "지원 현황"을 고르면 표/칸반이 바로 쓸 만한가 |
| 108 | 오리 대화 | 질문 뒤 "그중 제일 급한 게 뭐야?"로 **이어 묻기**가 되는가 |

(예전 톱5의 "메신저"는 제거돼 사라졌다 — 오리 대화는 대시보드 패널에서 한다.)

---

## 우선순위 — 이것부터

1. **`CRON_SECRET`** (2번) — 값이 이미 있어 붙여넣기만. 지금 열려 있는 통로를 닫는다
2. **Analytics 켜기** (3번) — 클릭 한 번, 안 켜면 계속 0건
3. **`SUPABASE_SERVICE_ROLE_KEY`** (1번) — MUST 기능 하나가 미완으로 남아 있다
4. 나머지는 급하지 않다
