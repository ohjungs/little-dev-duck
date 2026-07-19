# /next-step — 하네스 재개 커맨드

1. docs/Status.md를 읽어 현재 Phase와 미완료 Task를 파악한다.
2. docs/plans/phase_xx.md의 해당 Task 계획을 읽고, CLAUDE.md 원칙(STDD, ponytail, 계약 잠금,
   병렬 규칙, 안전 규칙)에 따라 진행한다. 구현 전 Pre-flight: 의존 계약 목록화, 기존 기능 탐색.
3. Task 완료 시: 검증 체크리스트 결과 보고 -> Status.md 체크 갱신.
4. Phase 완료 시: /review 수동 1회 -> docs/reviews/ 기록 -> History.md 체크 ->
   Status.md를 다음 Phase 대기로 전환 -> 다음 Phase 계획(docs/plans/phase_xx.md) 초안 제안.
5. 설계 결함 발견 시 STOP하고 보고한다. 몰래 변경 금지.
