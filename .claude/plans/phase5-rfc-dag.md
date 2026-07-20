# Phase 5 RFC-DAG 루프 Runbook

작성일 2026-07-21. `/loop-start` 요청으로 준비, **미시작 상태** — 사용자가 아래 "시작 커맨드"를
직접 실행할 때까지 대기한다. 이 runbook은 인프라 설계만 다루며, Phase 5 자체의 Task 상세 내용은
`docs/plans/phase_05.md`가 원본이다(충돌 시 그쪽이 우선).

## 0. 전제 상태 (2026-07-21 갱신)

- 브랜치 `main`, worktree 분리 없음(모노레포 단일 워킹디렉터리).
- 블로커 2(아키텍처 결정)는 해소됨 — 옵션 A 확정, ARCHITECTURE.md 1절 + DECISIONS.md #9-11 반영 완료.
- **블로커 1(Rust 툴체인)도 해소됨(2026-07-21, 별도 세션에서 사용자 요청으로 설치)** —
  rustup + VS Build Tools 2022, `cargo build` 실컴파일까지 검증 완료(docs/plans/phase_05.md 상세).
  **단, 사용자 지시로 T1/T2/T4 실제 구현은 다음 세션으로 이월** — rust-gate는 기술적으로는
  통과 상태지만, 이 정책 유예가 걸려 있는 동안은 N1/N2 노드를 자동 실행하지 않는다.
- 테스트 베이스라인: `pnpm test` 8/8 태스크 통과(2026-07-21, 루프 시작 전 안전 체크 완료).
- `ECC_HOOK_PROFILE` 환경변수 미설정 — 훅 전역 비활성화 아님(안전 체크 통과).
- **동시성 경고**: `.claude/scheduled_tasks.lock`에 PID 17248(`claude`, 2026-07-20 14:56 시작)이
  현재도 살아있음 — Status.md가 설명하는 기존 5분 주기 `/next-step` 폴링 루프로 추정된다. 이
  runbook의 루프를 실제로 시작하기 전에 그 루프와의 관계를 다시 확인할 것(동시에 같은 문서를
  건드리면 이전에 겪은 browse 데몬 락 경합이 재발할 수 있음). 사용자 지시(2026-07-21): 기존
  루프는 건드리지 않고 이 runbook만 준비해둔다.

## 1. 의존성 그래프

```
                     +--------------------------+
                     | rust-gate (폴링, no-op)   |
                     | cargo/rustc 설치 확인      |
                     +------------+--------------+
                                  | pass
                     +------------v--------------+
                     | N1. T1 Tauri 스캐폴딩       |  worktree A
                     | apps/desktop 신설, WebView  |  (계약 잠금:
                     | -> Vercel 배포 URL 로드      |   workspace 편입)
                     +------------+--------------+
                                  | (같은 패키지, 순차)
                     +------------v--------------+
                     | N2. T2 Rust 로그 수집기     |  worktree A
                     | collect_claude_logs invoke |  (N1 결과 위에서
                     | + collector://progress     |   이어서 작업)
                     +------------+--------------+
                                  |
+---------------------------+    |
| N0. T3 activity_daily     |    |   rust-gate와 무관, 독립 실행 가능
| supabase/migrations       |    |   (SQL만, apps/desktop과 파일 겹침 없음)
| up + down 스크립트 + RLS   |    |
+-------------+--------------+    |
              |                   |
              +---------+---------+
                        v
             +----------+-----------+
             | N3. T4 검증 (병합 지점) |
             | 빌드/실행, 수집기 동작,  |
             | 웹-위젯 데이터 공유 확인 |
             +----------------------+
```

## 2. 노드 정의

| ID | Task | 게이트 | 패키지 경계 | worktree | 산출물 검증 |
|---|---|---|---|---|---|
| rust-gate | Rust 툴체인 확인 | 없음(폴링 전용) | 없음 | 불필요 | `cargo --version` 성공 여부만 판정, 실패 시 아무 것도 건드리지 않고 STOP+보고 |
| N0 (T3) | activity_daily 마이그레이션 | 없음 — 즉시 착수 가능 | `supabase/migrations` | 선택(단일 파일 쌍이라 굳이 분리 안 해도 무방, YAGNI) | migration up/down 적용 테스트, RLS 정책 확인 |
| N1 (T1) | Tauri 2 스캐폴딩 | rust-gate pass | `apps/desktop` | A | `pnpm --filter desktop build` 성공, WebView가 Vercel URL 로드 확인 |
| N2 (T2) | Rust 로그 수집기 | N1 완료 + rust-gate pass | `apps/desktop/src-tauri` | A(N1과 동일, 순차) | invoke 핸들러 단위 테스트, 집계 결과가 원문을 포함하지 않는지 확인(프라이버시 원칙) |
| N3 (T4) | 통합 검증 | N0 + N1 + N2 전부 완료 | 전체(병합 지점, 직렬) | 없음(main으로 병합 후 실행) | Tauri 앱 실행 → 위젯 표시, 수집기 실행 → `activity_daily`에 오늘 집계 반영, 웹에서 동일 데이터 확인 |

- N0은 다른 어떤 노드와도 파일이 겹치지 않으므로 rust-gate 통과 여부와 무관하게 즉시 실행 가능 —
  Rust가 끝까지 설치되지 않아도 N0만은 완료해둘 수 있다.
- N1→N2는 같은 패키지(`apps/desktop`) 안에서 이어지는 작업이라 별도 worktree로 쪼개지 않고
  하나의 worktree A에서 순차 진행한다(CLAUDE.md 3-3 "패키지 경계 = 에이전트 경계" 원칙 — 여기선
  패키지가 하나이므로 에이전트도 하나).
- 동시 worktree 수는 최대 2개(A만 사용, N0은 필요시 B) — CLAUDE.md 3-3 상한(2~3개) 이내.

## 3. 안전 체크 (Required Safety Checks 대응)

- [x] **테스트 베이스라인**: 루프 시작 전 `pnpm test` 8/8 통과 확인(2026-07-21). 각 노드 완료 후
      해당 패키지 테스트 재실행 없이는 다음 노드로 진행하지 않는다.
- [x] **ECC_HOOK_PROFILE 비활성화 아님**: 환경변수 미설정 확인(2026-07-21).
- [x] **명시적 종료 조건**: 아래 4절.
- [ ] **동시 루프 충돌 회피**: 시작 직전 `.claude/scheduled_tasks.lock`을 다시 확인해 PID
      17248(또는 후속 프로세스)이 같은 문서(Status.md, phase_05.md)를 쓰고 있는 중이 아닌지
      확인할 것 — 사용자 판단으로 보류 중(2절 참조).

## 4. 종료 조건 (explicit stop conditions)

1. **정상 종료**: N3(T4) 검증 전부 통과 → `docs/Status.md`를 "Phase 5 완료"로 전환, History.md 기록,
   `docs/plans/phase_06.md` 초안 제안 후 루프 정지.
2. **블로커 재발 종료**: rust-gate가 계속 실패(Rust 미설치)하면 N1/N2/N3는 착수하지 않고, N0(T3)만
   완료된 상태로 "부분 진행, 사용자 조치 대기"를 보고하고 **각 tick마다 같은 조사를 반복하지 않도록**
   다음 tick은 rust-gate만 재확인 후 즉시 종료(CLAUDE.md 3-3 STOP 원칙, 기존 Status.md 지침과 동일).
3. **설계 결함 발견 종료**: 진행 중 새로운 아키텍처 결함이나 계약 충돌을 발견하면 몰래 고치지 않고
   즉시 STOP, 보고 후 게이트로 되돌린다(CLAUDE.md 3-3).
4. **사용자 중단**: 언제든 `/loop-status` 확인 후 명시적으로 중단 요청 시 즉시 정지.

## 5. 시작 커맨드 (아직 실행 안 함)

이 harness에서 실제로 루프를 돌리는 방법은 두 가지다. 규모가 작으므로(4개 노드, 진짜 동시성이
필요한 지점은 N0 vs N1뿐) 굳이 다중 에이전트 orchestration을 쓰지 않고 단일 세션이 순차로
처리해도 충분하다(YAGNI) — 아래 A안을 기본으로 권장한다.

**A. 단일 세션 자기 페이싱 루프(권장, 기본)**
```
/loop /next-step
```
간격을 생략하면 모델이 스스로 페이싱한다. 매 tick마다 이 runbook의 2절 표를 순서대로 확인하고,
게이트를 통과한 노드만 진행한다. 기존 PID 17248 루프와 동일한 메커니즘이므로, **시작 전 기존
루프를 중단했는지 먼저 확인**해야 중복 실행을 피한다.

**B. 명시적 DAG 병렬 실행(N0/N1이 실제로 동시에 뜰 필요가 생기면)**
```
"Phase 5 rfc-dag runbook(.claude/plans/phase5-rfc-dag.md) 기준으로 워크플로 실행해줘"
```
이 harness는 다중 에이전트 orchestration(Workflow) 실행에 사용자의 명시적 opt-in을 요구한다
("워크플로 사용해줘" 등 명시적 요청, 또는 ultracode 모드). 자동으로 트리거되지 않으므로, N0/N1을
진짜 병렬로 돌리고 싶을 때만 위 문구로 명시 요청할 것.

## 6. 모니터링 커맨드

- `/loop-status` — 현재 루프 tick 상태 확인
- `cat .claude/scheduled_tasks.lock` — 현재 이 저장소를 점유 중인 프로세스 확인(PID/세션)
- `docs/Status.md` 1절 — 최신 tick이 남긴 Phase 5 진행 요약
- `docs/History.md` — 노드 완료 시마다 기록되는 이력
- `pnpm test` — 임의 시점에 회귀 확인
