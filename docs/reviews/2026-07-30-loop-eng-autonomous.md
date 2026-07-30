# 리뷰 스냅샷 — 2026-07-30 `/loop-eng` 자율 사이클 9회

> `docs/reviews/`는 immutable(CLAUDE.md 4절). 이 문서는 이후 수정하지 않는다.
> 대상: 커밋 `12238c4` ~ `7ca8839` + 이번 사이클(오프라인 배너 접근성·교훈 기록).

## 1. 이번 묶음에서 무엇을 했나

사용자 지시 없이 돌아간 9회 사이클. 감사(claude-mem에 남은 이전 세션의 발견)를 **코드로
재검증**하는 것으로 시작해, 확인된 것만 고쳤다. 감사 지적을 그대로 믿지 않은 것이 이번 묶음의
핵심 습관이다 — 아래 "기각" 항목이 그 결과다.

| 분류 | 항목 | 커밋 |
|---|---|---|
| 접근성 | 라이트 테마 보조 텍스트 대비 3.74:1 → 5.62:1(실측) | `12238c4` |
| 접근성 | ConfirmDialog가 공용 `useModalA11y` 미사용(Tab 트랩·포커스 복원 없음) | `3d98af9` |
| 보안 | profiles `role`/`disabled_features` 권한상승 차단 트리거(**적용 대기**) | `167d5ee` |
| 보안 | `room_members`/`messages` `room_id` 불변 트리거(**적용 대기**) | `167d5ee` |
| 접근성 | `<html lang="en">` → `"ko"`(WCAG 3.1.1 Level A) | `be5523b` |
| 접근성 | GitHub 잔디 격자 대체 텍스트(`role="img"` + core 순수함수) | `be5523b` |
| 접근성 | 오리 응답 대기를 보조기술에 알림 + 문구 단일 출처 | `532718d` |
| 보안 | OAuth scope 6곳 중복 → 단일 출처(요청·기록 드리프트 차단) | `c9bb488` |
| 기능 | `updateCalendarEvent`(오리가 일정 수정) | `cd862de` |
| 안전 | `convertPageToDatabase` 승인 카드 라벨 누락(되돌릴 수 없는 작업) | `cd862de` |
| 기능 | `closeGithubIssue`(오리가 이슈 닫기) | `0659922` |
| 보안 | 기능 토글이 화면만 숨기고 API는 열려 있던 것(라우트 4개) | `e27fbc3`·`7ca8839` |
| 안전 | `requiresApproval` fail-open → fail-closed | `7ca8839` |
| 접근성 | 오프라인 배너 라이브 리전 | (이번 사이클) |

## 2. 기각한 감사 지적 (근거를 남긴 것이 산출물이다)

- **"Gmail OAuth scope 과다 권한"** → **사실 아님.** 어댑터는 읽기와 휴지통 이동만 하고,
  `messages.trash`는 `gmail.readonly`로 불가하며 `gmail.modify`가 Google이 제공하는 최소
  권한이다(더 넓은 `https://mail.google.com/`은 영구삭제 포함으로 CLAUDE.md 5절 위반).
  즉 **이미 최소값**이었다. 근거를 `lib/oauthScopes.ts` 주석에 박아 재지적을 막았다.
- **"PWA 절반 구현(서비스 워커 없음)"** → **결함 아님.** `OfflineIndicator`는 오프라인을
  알리기만 하고 오프라인 동작을 약속하지 않는다. 서비스 워커는 새 기능이며 캐시 스테일로
  앱을 깨뜨릴 위험이 있어 착수하지 않았다(ponytail YAGNI).
- **"AI 로딩에 단계 라벨 추가"** → **부분 기각.** 라이브 리전 누락(진짜 결함)은 고쳤지만,
  단계 표시는 서버가 실제 단계를 알려주지 않아(스트리밍 아님) **지어내야 하므로** 만들지 않았다.

## 3. 내가 낸 결함 (자체 발견·복구)

정직성 항목이라 따로 둔다. 둘 다 **전 패키지 재검증**으로 잡았다.

1. **낡은 빌드 스크린샷** — 회귀 격리로 `git stash` 후 재빌드했다가 복원 뒤 재빌드를 빠뜨렸고,
   포트에 남은 이전 서버가 낡은 화면을 응답했다. 잘못된 증거가 문서에 남았다 → 정정 표기 +
   올바른 재측정. → [[L-14]] 변종으로 기록.
2. **라우트 테스트 19건 파괴** — 기능 게이트가 새 의존성(`getMyAccess`)을 들여오면서 기존 mock에
   없어 실패. 두 테스트 파일 mock 보강으로 복구.

## 4. 정직하게 남기는 한계

- **실서버 미적용**: 보안 트리거 2건은 DDL이라 승인 대기(PENDING 머리말·mv 110). **적용 전까지
  두 구멍은 열려 있다.** 코드·롤백·정적 검사만 준비된 상태다.
- **로그인 뒤 화면 미확인**: e2e 인증 세션 만료로 9사이클 연속 대시보드·설정 화면을 실제로
  보지 못했다(mv 109). 이번 묶음의 접근성 수정 다수가 그 화면에 있다 — 유닛·정적 검사로만
  확인됐다.
- **외부 API 실반영 미확인**: `updateCalendarEvent`·`closeGithubIssue`는 가짜 fetch로만
  검증됐다(mv 112·113). 이 저장소는 같은 부류에서 "코드는 성공인데 11일 뒤 날짜에 0초 일정"을
  실기로만 잡은 전례가 있다.
- **새로 막은 라우트 2개는 정적 잠금만**: `news/collect`·`github/contributions`는 전용 테스트가
  없어 "코드에 게이트가 있는지"까지만 확인된다. 메커니즘의 런타임 증명은 duck-chat 라우트의
  403/200 양방향 테스트가 담당한다.

## 5. 관찰 — 이 묶음이 드러낸 구조적 경향

**주석이 약속한 계약은 검사가 없으면 거짓이 된다.** 이번에 찾은 인가 결함(`canUseFeature`)은
[[L-19]]와 같은 모양이고, L-19를 적어 둔 지 3일 뒤에 재발했다. 즉 **교훈 문서만으로는 재발을
막지 못한다** — 이번엔 정적 잠금 검사를 함께 넣었다. 이번 묶음에서 새로 만든 잠금 6종
(`globalsTextContrast`·`htmlLang`·`duckPendingAnnounce`·`oauthScopesSingleSource`·
`approvalLabelCoverage`·`apiFeatureGate`·`offlineAnnounce`)은 모두 그 판단에서 나왔고,
그중 `approvalLabelCoverage`는 **만든 다음 사이클에 내 실수를 즉시 잡아** 값을 증명했다.

## 6. 검증 상태 (이 스냅샷 시점)

- turbo lint+test **17/17 GREEN** — core 1366 / api 527 / web 573 / ai 18 / ui 8 / mascot 9
- tsc 전 패키지 clean · `next build` 성공
- eslint warning 2건은 이번 묶음과 무관한 기존 항목(DailyBriefing useMemo, MessageNotifySetting
  미사용 disable 지시자)
