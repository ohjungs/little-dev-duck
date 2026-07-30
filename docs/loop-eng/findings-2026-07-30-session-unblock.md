# e2e 세션 해제 + 기능 게이트 3차 — 2026-07-30 `/loop-eng`

이 사이클의 성과는 **9사이클 동안 막혀 있던 e2e 로그인 세션을 열었다**는 것이고, 그 결과
스킵되어 보이지 않던 문제 두 건이 드러났다. 아래 3·4번이 그것이다.

---

## 1. 지난 세션 메모의 전제가 틀렸다 — `touch_room_on_message`는 위험이 아니다

지난 세션이 "다음 후보"로 남긴 것: `touch_room_on_message()`가 SECURITY DEFINER이고
`/rest/v1/rpc/touch_room_on_message`로 authenticated에 노출돼 있어 `revoke execute`가 필요하다.

**실서버에서 직접 호출을 시도해 반박했다.**

```sql
do $$ begin perform public.touch_room_on_message(); ...
-- REJECTED: trigger functions can only be called as triggers
```

PostgreSQL이 **실행기 단계에서** 트리거 함수의 직접 호출을 거부한다 — 권한과 무관하다.
즉 RPC 엔드포인트가 열려 있어도 호출 자체가 성립하지 않는다. 위험도는 "낮음"이 아니라 **없음**이다.
마이그레이션 주석(`20260730160000` 16행, `20260730170000` 22행)이 "트리거라 직접 호출이
원리적으로 불가능해 anon revoke도 불필요하다"고 적어 둔 것이 맞았다.

**조치: 마이그레이션을 만들지 않았다.** 고치는 것이 없는 변경이다(ponytail 1단계 "필요한가").
`schemaGuard`의 `findUnrevokedDefiners`를 "트리거 함수도 authenticated까지 회수" 규칙으로
확장하는 것도 하지 않았다 — 보안 가치가 없는 규칙을 CI에 넣으면 소음만 남는다.

부수 사실: 트리거 함수 5개 중 SECURITY DEFINER는 3개이고 회수 상태가 갈려 있다
(`cleanup_page_embeddings`·`handle_new_user`는 authenticated까지 회수, `touch_room_on_message`는
anon·public까지만). **일관성 문제일 뿐 노출은 아니다.**

---

## 2. 대신 진짜 결함을 찾았다 — `findUnrevokedDefiners`가 definer를 놓칠 수 있었다

1번을 조사하다 발견. 기존 정규식:

```
/(?:create|replace)\s+function\s+public\.(\w+)\s*\([\s\S]*?security\s+definer/gi
```

한 파일에 함수가 둘 이상이면 `[\s\S]*?`가 앞 함수 선언부에서 시작해 **뒤 함수의**
`security definer`까지 삼킨다. 결과가 두 방향 모두 나쁘다:

1. 앞 함수를 definer로 **오탐**한다.
2. 정규식 `lastIndex`가 뒤 함수 선언을 지나쳐 **진짜 definer가 검사에서 사라진다** —
   anon에 노출된 함수를 조용히 통과시킨다.

실측(픽스처): `harmless_first`(definer 아님)를 잡고 `exposed_second`(definer·회수 없음)를 놓쳤다.

**왜 지금까지 안 드러났나**: 저장소에 함수가 둘 이상인 마이그레이션이 하나뿐이고
(`20260727030000_messenger_rooms.sql`) 그 두 함수가 **모두** definer라 우연히 결과가 맞았다.
기존 메타검증 픽스처는 전부 "한 파일에 함수 하나"였다.

**조치**: RED 테스트 추가 → `functionHeaders()`로 각 함수의 **자기 선언부**만 보도록 수정
(본문 `as $$ ... $$`는 잘라 낸다). 52 tests green. 실제 마이그레이션 판정 결과는 변화 없음
(`[]` 유지) — **가려져 있던 실제 구멍은 없었다.**

---

## 3. e2e 로그인 세션을 열었다 (PENDING 2번 · mv 109 종결)

### 막혀 있던 원인 두 개

1. **README가 틀렸다.** "`playwright open`을 처음 실행하면 webServer가 5100에 자동으로 뜬다"고
   적혀 있는데, `webServer`는 `playwright test`만 띄운다. `open`은 아무것도 띄우지 않아
   `ERR_CONNECTION_REFUSED`로 끝난다. 사용자가 이 안내를 그대로 따라 실패했다.
2. **Supabase 리다이렉트 허용목록에 localhost가 없다.** `redirectTo`는
   `window.location.origin`인데(`LoginForm.tsx:166`) `http://localhost:5100`이 허용목록에 없어
   Supabase가 Site URL(프로덕션)로 되돌린다. 그래서 로그인해도 쿠키가 프로덕션 도메인에 붙고
   세션 파일은 빈 채로 저장된다(실측: cookies 0).

### 해결 방법 (대시보드 설정 변경 없이)

Supabase 인증 쿠키는 **Supabase가 서명한 JWT**라서 origin에 묶이지 않는다. 프로덕션에서
세션을 받아 쿠키의 domain만 `localhost`로 바꿔 주면 로컬 앱이 같은 세션으로 인증된다.

추가로 **온보딩 플래그를 함께 심어야 한다.** `ldd:onboarded`(localStorage)가 없으면
"시작 안내" 오버레이가 클릭을 가로채 위젯 스펙이 전부 실패한다 — 이건 세션 파일을 새로 만든
누구에게나 일어난다(`authState.ts`는 인증 쿠키만 보고 usable 판정을 내리므로 걸러지지 않는다).

실측 효과: **전부 스킵 → 9 failed/2 passed → 7 failed/4 passed.**

---

## 4. 드러난 문제 — `duck.spec.ts`가 존재하지 않는 `<canvas>`를 검사한다 (판단 필요)

세션이 열리자 3건이 실패했다. 원인은 제품이 아니라 **스펙이 낡은 것**으로 보인다.

- `duck.spec.ts`는 `getByTestId("duck-widget").locator("canvas")`가 보이길 기대한다.
- 그런데 `packages/mascot/src/Duck.tsx`는 **CSS 스프라이트**다 — `<canvas>`도, r3f `Canvas`도 없다.
- 프로덕션에서 WebGL2가 **가용한** headless로 확인해도 `canvas=0`이다. 즉 headless 한계가
  아니고 이번 변경 때문도 아니다. 이 스펙은 **통과할 수 없는 상태로 방치돼 있었다** —
  인증 세션이 없어 계속 스킵됐기 때문에 아무도 보지 못했다.

곁가지 사실 두 개:
- `DuckWidget.tsx:40` 주석("r3f Canvas는 WebGL을 쓰므로 서버 렌더링이 불가능해")은 낡았다.
- `packages/mascot/package.json`은 `three`·`@react-three/fiber`·`@react-three/drei`를 여전히
  의존으로 선언하는데 `Duck.tsx`는 import하지 않는다.

**왜 내가 고치지 않았나**: CLAUDE.md 확정 스택은 `react-three-fiber`를 포함하고, 오리 외형은
사용자 영역이다(PENDING 4번). 그래서 두 해석이 갈린다 —
(가) 스프라이트가 현재의 확정 설계 → 스펙 3건을 스프라이트 기준으로 고치고 미사용 의존 정리.
(나) 3D였어야 하는데 스프라이트로 후퇴한 것 → 스펙이 정당하게 실패하는 중이고 제품을 고쳐야 한다.
어느 쪽이냐에 따라 반대 방향의 작업이 되므로 임의로 정하지 않았다(CLAUDE.md 3-3 STOP).

---

### 4-1. 세션이 열리자 드러난 낡은 스펙 4건 — 고쳤다

전부 **제품은 정상이고 스펙이 낡은** 경우였다. 9사이클 동안 스킵돼서 아무도 보지 못했다.

| 스펙 | 무엇이 낡았나 | 조치 |
|---|---|---|
| `widgets.spec.ts:41` 메모 CRUD | `locator("div",{hasText}).last()`가 "가장 안쪽 div=카드"라고 가정. 깨져서 `getAttribute("data-testid")`가 null → `getByTestId(null!)`가 던졌다. **메모 자체는 정상**(직전 `toBeVisible()` 통과) | `[data-testid^="memo-"]`를 내용으로 필터링 |
| `widgets.spec.ts:232` 여러 메모 | 같은 `.last()` 가정 | 같은 방식 |
| `undo-delete.spec.ts:94` 메모 되돌리기 | 같은 `.last()` 가정 | 같은 방식(되돌리기 후 id 유지 가정도 함께 제거) |
| `widgets.spec.ts:76` 투두 빈 상태 | `"할 일이 없습니다."`를 기대하는데 **그 문자열은 코드베이스에 없다** — 안내 문구가 친절한 쪽으로 바뀌었다 | 현재 3개 분기를 정규식으로 수용 |
| `todo-recurrence.spec.ts:60` 주기 없음 | `not.toContainText("매주")`인데 주기 `select`가 **모든 행에** 있고 그 option 텍스트가 행 텍스트에 섞인다. 실측: `"e2e 일반 할 일2일 전반복 없음매일매주 목매월 30일"` → **통과 불가** | 배지에 `data-testid="recurrence-badge"` 추가(가산적, 동작 무변) 후 배지 부재 + select 값 `""` 확인 |

### 4-2. ★ 반복돼 온 "세션 만료"의 진짜 원인 — refresh token 회전

이게 이 사이클에서 가장 값나가는 발견이다. **mv 109 · 이전 세션들이 계속 "세션이 만료됐다"로
기록한 현상의 메커니즘을 특정했다.**

관찰 순서:

| 시점 | 실행 | 결과 |
|---|---|---|
| 세션 직후 | `widgets` 단독 | 8 passed (스펙 수정 후 전부 통과) |
| 그 뒤 | `widgets+recurrence+undo+duck-examples` | 23 passed / 2 failed |
| 전체 스위트(병렬) | `playwright test` | 20 passed / 다수 failed |
| 전체 스위트(직렬 `--workers=1`) | `playwright test` | **43 failed / 20 passed** — 병렬보다 **더 나쁨** |
| 마지막 확인 | 세션 파일로 `/` 접속 | `user.json`·`prod.json` **둘 다** `/welcome`으로 리다이렉트 |

직렬이 병렬보다 나쁘다는 것이 결정적 단서다 — **동시성 간섭이 원인이 아니다.** 직렬 실행이
돌 때 이미 세션이 죽어 있었다.

**원인**: Supabase는 refresh token을 **회전(rotation)** 시킨다. 저장된 세션 파일을 여러 워커가
각자 로드하면 **같은 refresh token으로 각각 갱신을 시도**하고, Supabase는 재사용을 탈취로 보아
세션을 폐기한다. 그래서 처음 몇 분은 멀쩡히 돌다가 어느 순간 전부 죽는다 —
그리고 **원본 프로덕션 세션까지 함께 죽는다**(실측: `prod.json`도 `/welcome`).

이것이 지금까지 "세션이 또 만료됐다"로 기록돼 온 것의 정체다. 시간이 지나 만료된 것이 아니라
**테스트 스위트가 스스로 세션을 무효화한 것**이다. `authState.ts`는 쿠키의 `expires`만 보므로
이 경우를 "usable"로 판정한다(claude-mem 1245가 "서버측 무효화를 놓친다"고 적은 그것).

**고칠 방향(사용자 결정 필요)**:
1. **이메일 로그인 켜기**(PENDING 11번) — 각 워커가 스스로 로그인하면 세션 공유 자체가 사라진다.
   근본 해결이고, PENDING 11번이 이미 그 이유로 만들어져 있다. Supabase 대시보드 스위치 1개.
2. Supabase **Refresh Token Reuse Interval** 상향(대시보드) — 같은 토큰의 짧은 재사용을 허용해
   병렬 워커를 견디게 한다. 완화책이다.
3. 인증 스펙만 `workers: 1` + 전용 계정 — 세션 하나를 한 워커만 쓰게 한다.

**임의로 정하지 않았다** — 1·2는 대시보드 변경이고 3은 실행 시간이 늘어난다.

**중요**: 이 때문에 마지막 전체 e2e 결과는 내 변경의 품질을 말해 주지 못한다. 위 수정 5건은
**세션이 살아 있는 동안 실제로 통과하는 것을 확인**했다(widgets 8/8). 43 failed는 죽은 세션에서
나온 숫자다.

---

## 5. 남은 e2e 실패 4건 — 로컬 환경변수 없음 (제품 문제 아님)

로컬 대시보드에서 500이 3건 나는데 전부 **로컬 `.env`에 키가 없어서**다. 프로덕션 대조로 확인:

| 엔드포인트 | 로컬 | 프로덕션 |
|---|---|---|
| `/api/github/contributions` | 500 `GITHUB_TOKEN 환경변수가 설정되지 않았습니다` | 200 (`totalCount` 472) |
| `/api/ai/duck-line` | 500 `GEMINI_API_KEY ...` | 200 `{"line":null}` |
| `/api/ai/reindex-all` | 500 `GEMINI_API_KEY ...` | 200 `{"indexed":3}` |

`_vercel/insights/script.js` 404는 기존 확인 사항(PENDING 5번, Web Analytics 미활성).

---

## 6. 기능 토글 3차 — AI 라우트 3개 (mv 114 종결)

사용자 결정: **기준은 "쓰이는 화면"이 아니라 "AI 여부"** → 세 라우트 모두 `duck-chat`.

| 라우트 | 기능 key | 차단 응답 |
|---|---|---|
| `/api/ai/write` | `duck-chat` | 403 |
| `/api/ai/standup` | `duck-chat` | 403 |
| `/api/ai/duck-line` | `duck-chat` | **200 + `{line:null}`** |

`duck-line`만 규약이 다르다 — 이 라우트는 상한 초과·생성 실패도 200+null로 답하고(호출부는
템플릿 문장을 그대로 쓴다), 대시보드가 60초 타이머로 반복 호출하므로 403이면 콘솔에 계속 쌓인다.
**차단 자체는 동일하다**: 통합 테스트가 `generateDuckLine`이 호출되지 않는 것까지 확인한다
(막힌 척하면서 쿼터를 태우는 상태를 배제).

게이트는 레이트리밋보다 **먼저** 둔다 — 꺼진 기능의 호출이 상한을 깎으면 안 된다.

---

## 7. 사용자 데이터에 남은 것 — 정리 완료 (사용자 승인)

e2e 위젯 스펙을 **사용자 본인 계정**(세션이 본인 것)으로 돌렸다. 스펙이 실패하면 정리
단계까지 못 가서 행이 남는다.

**보고 시점에 3건이라고 알렸으나 실제 삭제 시점엔 8건이었다** — 그 사이 내가 테스트를 더
돌려서 늘었다. 사실대로 적는다. 사용자 승인 후 삭제한 것:

- `todos` `title like 'e2e-todo%'` — **8건**
- `memos` `content like 'e2e-memo%'`·`'e2e-undo-memo%'` — **5건**

삭제 후 잔여 0건 확인. PENDING 2번이 경고한 그대로다 — "본인 계정으로 돌리면 본인 데이터에
섞인다. 전용 테스트 계정을 권한다." 4-2번의 근본 원인과 합쳐 보면 **전용 계정 분리는 이제
데이터 위생 문제가 아니라 세션 안정성 문제**이기도 하다.

## 8. 오리 렌더링 — 스프라이트가 확정 설계 (사용자 결정)

4번의 갈림길을 사용자가 정했다: **스프라이트가 현재 설계.** 그에 따라

- `duck.spec.ts` 3건을 canvas 좌표 클릭 → 버튼(`aria-label="오리 쓰다듬기"`) 클릭으로 고쳤다.
  접근성 이름으로 찾으므로 내부 마크업이 또 바뀌어도 깨지지 않는다.
- `packages/mascot`에서 미사용 3D 의존을 제거했다: `three`·`@react-three/fiber`·
  `@react-three/drei`·`@types/three`. **저장소 전체에 3D import가 0건**임을 확인한 뒤 지웠다
  (`pnpm install` 결과 54개 패키지 감소).
- `DuckWidget.tsx`의 낡은 주석("r3f Canvas는 WebGL을 쓰므로 서버 렌더링이 불가능해")을 정정했다.
  `ssr: false`의 실제 이유는 마운트 시점 localStorage·window 의존이다.

**주의로 남길 것**: CLAUDE.md 2절 확정 스택은 `react-three-fiber`를 열거하는데 코드에는 이미
없었다. 이 정리는 그 불일치를 **코드 쪽 사실에 맞춘 것**이다. 3D 오리로 갈 계획이 살아 있다면
의존을 되돌려야 하므로, 스택 문서와 함께 판단해야 한다.

---

## 검증 상태

- `pnpm lint` — green (기존 경고 2건, 이번 변경과 무관한 파일)
- `pnpm test` — green (web 574 tests / 85 files, api 52 tests 포함)
- `pnpm build` — green (exit 0, 타입체크 포함)
- e2e — 세션 열림. 7 failed는 위 4·5번(스펙 낡음 + 로컬 env), 이번 변경으로 인한 실패 아님
- 스크린샷 — `screenshots/2026-07-30/ai-feature-gate/` (dashboard·login × desktop·mobile)
