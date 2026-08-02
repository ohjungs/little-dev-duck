# 인계 — A1 스프레드시트 T5 (격자 화면) 착수

작성 2026-08-02. 앞 세션이 T1~T4(엔진)를 끝냈고, 다음 세션은 **화면**을 만든다.

## 다음 세션의 목표

**T5 — 격자 렌더 + 셀 편집 + 수식 입력줄.** 여기서부터 눈에 보인다.

스펙: [docs/specs/2026-08-02-spreadsheet-a1.md](../specs/2026-08-02-spreadsheet-a1.md) (status: approved).
T5의 수용 기준은 그 문서의 AC-19~AC-22와 4절 표를 본다 — **여기에 다시 적지 않는다.**

## 지금 상태

엔진은 완성됐고 화면이 하나도 없다. 커밋 `01cb5a7`(T4) → `64ba8bb`(빌드 타깃 수정)까지 CI 세 잡 전부 초록.

| 단계 | 산출 | 검사 |
|---|---|---|
| T1 | `packages/core/src/domain/sheet.ts` · `supabase/migrations/20260802100000_sheets.sql` | 79 + pgTAP 17 |
| T2 | `formula-parse.ts` | 71 |
| T3 | `formula-eval.ts` · `recalc.ts` | 25 |
| T4 | `formula-fns.ts` (함수 53개) | 68 |

DB는 **실서버에 이미 적용돼 있다**(`sheets` · `sheet_cells`, RLS + 소유자 트리거).
어드바이저 ERROR 0건. 되돌리기: `supabase/rollback/20260802100000_sheets_down.sql`.

**아직 없는 것**: `packages/api`에 시트 읽기·저장 함수가 없다. 화면 전에 그것부터 만들어야 한다
(계약은 스펙 6절에 적혀 있다).

## 다음 세션이 정해야 하는 것

1. **가상 스크롤을 어디까지 만들 것인가.** 스펙 D-5가 "직접 구현, DOM으로"까지만 정했다.
   보이는 사각형 + 여유분 렌더가 최소선이고, 틀 고정·병합 셀은 T7이라 T5에서 어디까지
   미리 감당할지는 열려 있다.
2. **저장 시점.** 셀을 고칠 때마다 upsert할지, 디바운스로 묶을지. 셀 테이블을 고른 이유가
   "한 글자에 문서 전체를 다시 쓰지 않기"였으므로 셀 단위 upsert가 자연스럽지만,
   연타 시 요청 수가 늘어난다. 기존 `PageEditor`의 디바운스 저장이 참고가 된다.
3. **`packages/api` 함수 시그니처.** 화면이 쓰기 시작하면 바꾸기 비싸다 — 먼저 잠근다.

## 알아야 할 함정 (앞 세션이 실제로 밟았다)

- **`pnpm --filter @ldd/core exec tsc --noEmit`만으로 "통과"라고 하면 안 된다.**
  같은 core 소스를 `apps/web` 빌드가 **더 낮은 타깃**으로 다시 타입체크한다. `/s` 정규식
  플래그가 여기서 깨져 CI가 잡았다(`64ba8bb`). 반드시 `pnpm build`로 확인한다.
- **`pnpm test | tail`은 종료 코드를 가린다.** 실패를 못 보고 푸시할 뻔했다.
- **이 폴더에 다른 세션이 동시에 작업 중이다**(사용자가 의도한 것). `git add -A`를 쓰지 말고
  내가 만진 경로만 stage한다. 경위: [findings-2026-08-02-shared-folder-commit.md](findings-2026-08-02-shared-folder-commit.md).
- **권한 검증은 그 권한으로 해야 한다.** service_role로 확인하면 RLS를 통째로 우회해서
  죽은 정책을 못 잡는다 — CI의 pgTAP이 잡아 줬다(`1ec6bf1`).
- Docker·Supabase CLI가 이 PC에 없다. pgTAP은 로컬에서 못 돌리고 CI `db-tests`가 실측한다.

## 쓸 만한 스킬

- `superpowers:test-driven-development` — T5는 렌더 테스트가 선행이다(`vitest.config.ts`의
  파일 단위 jsdom pragma를 쓴다. 예: `src/components/__tests__/ErrorBoundary.test.tsx`)
- `frontend-design` + `ui-ux-pro-max:ui-styling` — 격자·수식 입력줄 미감
- `ponytail` — 가상 스크롤을 직접 만들기로 한 판단이 흔들릴 때
- `superpowers:verification-before-completion` — 위 함정 1·2가 정확히 이 스킬이 막는 부류다

## 참고 (중복 금지 — 경로만)

- 스펙: [docs/specs/2026-08-02-spreadsheet-a1.md](../specs/2026-08-02-spreadsheet-a1.md)
- 사용자 결정: [DECISIONS-2026-08-01.md](DECISIONS-2026-08-01.md) (C-1~C-9)
- 설정 절차서(사용자 몫 남은 것): [USER-SETUP-2026-08-01.md](USER-SETUP-2026-08-01.md)
- 커밋: `32dd640`(T1) · `1ec6bf1`(T1 수정) · `b3f7cd1`(T2·T3) · `01cb5a7`(T4) · `64ba8bb`(빌드 수정)

## 사용자에게 아직 남은 것 (코드로 못 하는 것)

`CRON_SECRET` 넣기 · Vercel Analytics 켜기 · Supabase 비밀번호 정책 · Sentry DSN ·
습관 체크박스 오류 문구 알려주기. 전부 [USER-SETUP-2026-08-01.md](USER-SETUP-2026-08-01.md)에 절차가 있다.
