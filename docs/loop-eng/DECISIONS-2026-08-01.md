# 사용자 결정 기록 (2026-08-01)

[USER-SETUP-2026-08-01.md](USER-SETUP-2026-08-01.md)의 질문 8건과, 그 과정에서 새로 생긴
결정에 사용자가 답한 내용이다. **이 문서가 그 답의 단일 출처**다.
직전 회차는 [DECISIONS-2026-07-31.md](DECISIONS-2026-07-31.md).

---

## 결정 8건

| # | 항목 | 결정 | 파급 |
|---|---|---|---|
| C-1 | A1 스프레드시트 (B-2 후속) | **착수** | 기존 Phase 33(열 집계)을 버린다. 수식 파서·셀 참조·재계산 그래프가 새로 필요 |
| C-2 | 자유 배치 슬라이드 편집기 (B-3 후속) | **착수** | 기존 Phase 34(발표 모드)를 버린다. BlockNote 위에 못 얹어 사실상 새 에디터 |
| C-3 | 오리 코스튬 | **에셋을 먼저 찾아본다** — opengameart·kenney 등에서 쓸 만한 게 없으면 보류 | 그림이 확보돼야 해금·선택 UI를 만든다 |
| C-4 | 브리핑 카드 기사 이미지 생성형 폴백 | **추진** | RSS 추출분은 이미 배포됨. Gemini 무료 티어 이미지 생성 가능 여부 확인이 선행 |
| C-5 | AI 라우트 3개의 기능 소속 | **`duck-chat`(오리 대화)에 묶는다** — 대시보드와 오리 대화가 한 덩어리 | `/api/ai/write` · `/api/ai/standup` · `/api/ai/duck-line` |
| C-6 | i18n(다국어) | **착수** | 전 화면 문자열 외부화 + 라우팅 |
| C-7 | Sentry | **계정을 만든다** — 가이드 제공함 | DSN을 `NEXT_PUBLIC_SENTRY_DSN`으로 넣으면 SDK 배선 + PII 스크러빙 구현 |
| C-8 | Speed Insights | **의존성 추가** | `@vercel/speed-insights` |

## C-9 — service_role 키 유출과 legacy 키 처리

사용자가 `service_role` 키를 대화창에 붙여넣었다. 나는 그 값을 **파일·커밋·기억 어디에도
저장하지 않았고** 이후 절차에서 사용하지 않았다. 대신 새 방식(`sb_secret_...`)으로 갈아타도록
안내했고 사용자가 그렇게 했다.

남은 것은 **유출된 legacy `service_role` JWT를 죽이느냐**였다. legacy `anon`과 같은 JWT 비밀로
서명돼 있어 개별로 끌 수 없고, 끄면 `anon`도 함께 죽는다.

**사용자 결정: legacy 키를 그대로 둔다.** 사유는 "내부적으로 나만 쓴다".

사실 관계를 남긴다 — 우려를 다시 제기하지 않기 위해서다:

- 이 저장소는 **public**이라 프로젝트 주소(`iupprzfmlyfrdcctdupn.supabase.co`)는 공개돼 있다.
- 노출 경로는 **이 대화 기록**(로컬 세션 파일 + Anthropic 서버)이다. 인터넷 공개는 아니다.
- 즉 유출된 키는 **유효한 채로 남는다.** 사용자가 이 상태를 알고 고른 선택이다.
- 마음이 바뀌면: Supabase → Settings → API Keys → Legacy API keys 비활성화.
  그 전에 Vercel의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 publishable인지 확인해야 사이트가 안 죽는다.

**함께 한 조치**: 로컬 `apps/web/.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를
publishable 키(`sb_publishable_...`)로 교체했다. 교체 전 그 키로 Supabase REST를 직접 호출해
200을 확인했다. 다른 줄은 건드리지 않았다(23줄 그대로). 나중에 legacy를 꺼도 로컬이 안 죽는다.

## 설정 항목 진행 상태 (2026-08-01 실측)

| 항목 | 상태 | 확인 방법 |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (계정 삭제) | **완료** | 전용 테스트 계정으로 프로덕션 로그인 → 설정 화면에 "계정까지 영구 삭제" 버튼 렌더 확인 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` → publishable | 프로덕션 정상 동작 확인(keepalive 200), 로컬 교체 완료 | — |
| legacy JWT 키 | **활성 유지** (C-9 결정) | `get_publishable_keys` 조회 2회, `disabled: false` |
| `CRON_SECRET` | 미설정 | `/api/keepalive`가 인증 없이 200 |
| Vercel Analytics | 미확인 | `/_vercel/insights/script.js` 응답 코드로 판정 |
| Supabase 비밀번호 정책 | 미설정 | 유출 비밀번호 차단은 Pro 플랜이라 무료 티어에서 불가(공식 문서 확인) |
| CI e2e 시크릿 | 미등록 | `E2E_EMAIL`/`E2E_PASSWORD` 방식 권장(base64 세션 방식은 만료 문제로 대체) |

## 내가 낸 실수 기록

프로덕션 확인 스크립트가 버튼 이름을 **"계정 영구 삭제"**로 찾았는데 실제 이름은
**"계정까지 영구 삭제"**였다. 그래서 "키 미설정"이라고 잘못 보고했다가 스크린샷을 보고 정정했다.
문자열 일치로 화면을 판정할 때는 **코드에서 실제 문자열을 먼저 확인**한다.
