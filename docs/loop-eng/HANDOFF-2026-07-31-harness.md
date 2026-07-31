# 인수인계 — loop-eng 하네스 수리 (2026-07-31 저녁 세션)

이 문서는 **하네스 자체**를 고친 세션의 인수인계다. 제품 백로그 관점의 다음 할 일은
[NEXT-2026-07-31.md](NEXT-2026-07-31.md)에 있다(그 문서의 D절은 이번 세션 결과로 갱신됨).

**하네스 코드는 `~/.claude/` 아래라 이 저장소에 없다.** 여기 담긴 건 대장·기록뿐이다.

---

## 다음 세션의 목표

**사이클 하나를 끝까지 돌려서 커맨드 층이 어디서 새는지 관측한다.** 그 관측이 있어야
`loop-state.mjs apply-cycle`(아래 열린 결정 1번)을 추측이 아니라 근거로 설계할 수 있다.

---

## 지금 상태

### 고친 것 — 루프가 5사이클 연속 통과 0건이던 원인 둘

1. **라운드 예산이 성공 조건보다 작았다.** `dev-harness-loop`은 라운드 1회에 계획 항목 1개를
   전진시키는데 상한이 3이었고 계획 항목은 보통 4~6개였다. SUCCESS가 산술적으로 불가능했고
   3연속 실패 재계획은 짜자마자 상한에 걸려 버려졌다. → 상한을 `max(호출자 값, 항목 수+2)`,
   절대 상한 12로. `/loop-eng`이 넘기는 값도 3 → 8.
2. **통과 기준이 코드베이스 전체를 물었다.** → 하드 렌즈(regression·authz·injection·secret-leak·
   backward-compat·data-integrity)만 통과를 막고, 나머지 16개 소프트 렌즈 실패는 `followUps`로
   대장에 새 항목 적재. 미실행·미보고 0건 요구는 유지.

함께 고친 것: `blocked`도 연속 실패로 세기 · 보류 기록에 `itemKey` 강제(fail-closed)와 `resolve`
해소 명령 · 발굴 하네스에 판단 대장 전달(중복 발굴 차단) · 심각도 우선 후보 정렬 · 승인된 항목의
`approved:true` 우회 · 대장 같은 키 여러 줄 필드 단위 병합 · 재시도 라운드 설계 재사용 ·
모델 티어 호출부 지정(워크플로 4개 34곳: Sonnet 31·Opus 2·Haiku 1) · 락 임계 30 → 90분과
레지스트리 유령 항목 자가 회복.

### 검사 — 전부 통과, 하나는 신규

```
node ~/.claude/commands/loop-eng.check.mjs        문서↔코드 일관성 (10건, 신규)
node ~/.claude/workflows/loop-eng-cycle.check.mjs  (25건)
node ~/.claude/workflows/dev-harness-loop.check.mjs (9건, 신규)
node ~/.claude/workflows/dev-harness-plan.check.mjs
node ~/.claude/scripts/loop-state.check.mjs        (9묶음)
```

`loop-eng.check.mjs`는 문서와 코드 양쪽에 적힌 상수가 어긋나면 실패한다. 하루 작업만으로 세 곳이
어긋나서(락 임계 30↔90분, 존재하지 않는 pid 규칙, failStreak 정의) 만들었고, 변이 3개로 실제로
잡는 것을 확인했다. **하네스 코드를 고쳤으면 이 검사부터 돌려라.**

### 대장 정리

- 미완 51건에 `severity` 부여(S1 5 · S2 19 · S3 27). append-only, 기존 줄 무수정.
- `security: OAuth 토큰 암호화` → **기각.** 사유는 대장 줄에 있다. 요지: 서버가 복호화 키를 들고
  있어야 해 키 관리 문제를 새로 만들고, 실제 노출 경로(XSS가 사용자 세션으로 SELECT)를 줄이려면
  암호화가 아니라 SELECT 정책 제거 + 서버 읽기 4곳을 service_role로 전환하는 쪽이다.
  개인 워크스페이스라 지금은 위험을 받아들인다. **재발굴 금지.**
- S1 3건을 보류로 이관(manual-verification.md 116·117·118 + manual-open.jsonl, itemKey 포함):
  비밀번호 강도·재인증(Supabase 대시보드 설정) · e2e 프로덕션 분리(방식 결정 필요) ·
  습관 체크박스(화면 오류 문구 필요).
- 결과: 후보 44건, 상위가 S2로 내려옴. 다음 사이클 1번 후보는
  `test: AdminUserPanel 역할 변경 권한 테스트 추가`.

### 막힌 것

- **사이클을 한 번도 끝까지 못 돌렸다.** 두 번 띄웠고 둘 다 중단했다.
  - 1차: 1번 후보가 OAuth 토큰 암호화로 잡혀 사용자 판단으로 중단 → 기각 처리.
  - 2차(cycles.jsonl 6번): 유효성 확인 통과 후 BUILD 진입 직후 세션 종료로 중단. 코드 수정 전이라
    부분 변경 없음.
- **오늘 모든 수리는 스텁 기반 단위 검사로만 확인됐다.** 실제 에이전트가 붙은 사이클의 동작은
  아직 미검증이다.

### 주의 — 같은 저장소에 다른 세션이 동시 작업 중이었다

`61cef3b`까지 다섯 커밋이 그 세션 것이고, **제 대장 변경이 그 세션의 `fix(auth): ...` 커밋에
휩쓸려 들어갔다.** 내용은 다 들어갔지만 커밋 메시지와 무관해 추적이 어렵다.

재개 전에 반드시:
- `git status`로 워킹 트리가 깨끗한지, 다른 세션이 도는지 확인
- `docs/Status.md`가 321줄 줄어든 상태로 커밋됐는데 그 시점에 아카이브 파일이 없었다.
  `scripts/archive-status.mjs`가 그 세션 산출물이니 이관이 마무리됐는지 확인할 것
- 루프 락(`.claude/loop-eng.lock`)은 해제해 뒀다

---

## 다음 세션이 정해야 할 것

1. **`loop-state.mjs apply-cycle`을 만들 것인가.** 커맨드 2-8이 지금 산문 의무 8개를 지고 있고
   (사이클 기록·needsApproval 보고와 approved 줄·skippedStale done·보류 이관·done+commit·
   followUps 적재·Status 갱신·기억 저장) 이번 세션이 그중 3개를 얹었다. 관측된 하네스 사고는
   거의 전부 이 층에서 났다. 워크플로 반환 객체를 통째로 받아 한 번에 쓰는 명령 하나로 접는 게
   답이라고 본다. **다만 사이클을 한 번 끝까지 돌린 뒤에 설계할 것** — 무엇을 담아야 하는지가
   지금은 추측이다.
2. **`spec-harness-loop.js` 모델 티어 지정 14곳을 되돌릴 것인가.** 사용자는 `/loop-eng` 점검을
   요청했는데 이건 `/spec-loop`의 워크플로다. "같은 결함 클래스일 것"이라는 판단으로 손댔고
   실제로는 라운드 상한 결함이 없었다(기본 8). 결과적으로 티어만 바꿨다. 스코프 위반이므로
   사용자 판단이 필요하다.
3. **워크플로 args 전달 방식.** 대장을 통째로 넘기느라 페이로드가 25~31KB다. 모델이 매 사이클
   그만큼을 손으로 인자에 써넣어야 하고 대장이 자랄수록 커진다. DECIDE는 100% 결정적 코드이니
   `loop-state.mjs`로 옮기고 상위 후보 몇 건만 넘기면 2KB 미만이 된다. 할지 말지.
4. **승인 대기 3건**(messages RLS 불변조건 · message-attachments 삭제 정책 · RLS 통합 테스트).
   승인하면 대장에 `{"titleKey":"...","verdict":"confirmed","approved":true}` 한 줄을 덧붙여야
   루프가 착수한다. 안 적으면 매 사이클 같은 보고가 반복된다.

---

## 다음 세션이 쓸 스킬

- **`/loop-eng`** — 사이클 실행. 커맨드 2-0의 `loop-state.mjs` 사용법을 그대로 따를 것.
- **`karpathy-guidelines`** — 이번 세션에서 자기 감사에 썼고 실제로 죽은 코드 1건과 스코프 위반
  1건을 잡았다. 하네스를 더 고칠 거면 다시 쓸 것.
- **`ponytail`** — 하네스에 기능을 더 얹기 전에. 이번 세션에서 "나중에 쓸지 모르니 남겨둔" pid
  생존 확인이 실측으로 죽은 코드였다.
- **`superpowers:verification-before-completion`** — 특히 "돌려봤다"고 말하기 전에.
- `tokensave` — 모델 티어를 더 손볼 때.

---

## 산출물

| 무엇 | 어디 |
|---|---|
| 하네스 코드·검사 | `~/.claude/workflows/` · `~/.claude/scripts/loop-state.mjs` · `~/.claude/commands/loop-eng.md` |
| 커맨드 규범과 상태 파일 계약 | `~/.claude/commands/loop-eng.md` (2-0 · 3-1 · 8-1 · 9장 · 11장) |
| 판단 대장 | [../plan-ledger.jsonl](../plan-ledger.jsonl) — 117줄, severity 포함 |
| 사이클 기록 | [cycles.jsonl](cycles.jsonl) — 6줄 |
| 실기검증 대기 | [manual-open.jsonl](manual-open.jsonl) · [manual-verification.md](manual-verification.md) 116~118 |
| 제품 백로그 관점 다음 할 일 | [NEXT-2026-07-31.md](NEXT-2026-07-31.md) |
| 이번 세션 시작 커밋 | `0bf9b3e` (그 이후 `61cef3b`까지는 다른 세션) |
