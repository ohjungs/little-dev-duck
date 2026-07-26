# 2026-07-27 — Phase 41 T3: 비밀번호 재설정

촬영: `next build` 후 `next start`(포트 5100) 실제 렌더. 임시 스펙으로 찍고 스펙은 지웠다
(스크린샷과 이 문서만 남긴다 — 회귀 가드는 `auth-redirect.spec.ts`에 별도로 넣었다).

| 파일 | 화면 / 상태 | 뷰포트 |
|---|---|---|
| `login__default__desktop.png` | 로그인 탭 기본 — "비밀번호를 잊으셨나요?" 진입점 | desktop 1440×900 |
| `login__default__mobile.png` | 위와 같음 | mobile 390×844 |
| `login__reset-empty-email__desktop.png` | 이메일 없이 재설정을 눌렀을 때의 안내 | desktop |
| `login__reset-empty-email__mobile.png` | 위와 같음 | mobile |
| `login__signup-tab__desktop.png` | 가입 탭 — 재설정 진입점이 **사라진** 상태 | desktop |
| `login__signup-tab__mobile.png` | 위와 같음 | mobile |

## 확인한 것

- 진입점이 로그인 버튼 아래에 붙고, **가입 탭에서는 사라진다**(계정이 없는 사람에게 재설정은
  막다른 길이다). 두 뷰포트 모두.
- 가로 overflow 0 · 콘솔 오류 0(`/_vercel/*` 인프라 404는 `public-visual.spec.ts`가 문서화한
  예외 그대로 제외 — 관측 건수만큼만).
- 모바일에서 문구가 끊기지 않는다(직전 T1에서 `이/메일로`로 끊겼던 자리 — `break-keep` 유지됨).

## 못 찍은 것 (정직하게)

- **`/auth/reset`의 새 비밀번호 폼.** 그 화면은 메일 링크로 세션을 받은 뒤에만 열린다.
  세션 없이 열면 `proxy.ts`가 303으로 `/welcome`에 돌려보낸다(그게 의도이고,
  `auth-redirect.spec.ts`가 그 동작을 못박는다).
  실제 폼을 보려면 **Email provider가 켜져 있어야** 하고 메일이 실제로 발송돼야 한다 →
  [manual-verification.md](../../manual-verification.md)에 보류 항목으로 적었다.
- **재설정 메일 발송 성공 화면.** 찍으려면 실제 주소로 메일이 나간다(되돌릴 수 없는 외부 발송).
  네트워크를 타지 않는 상태(빈 이메일 안내)만 찍었다.
