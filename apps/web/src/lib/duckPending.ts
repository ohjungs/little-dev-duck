// 2026-07-30 : 접근성 - 오리 응답 대기 알림 - 단일 출처 (감사 발견)
//
// 오리 응답을 기다리는 동안 보조기술에 읽히는 문구. 대시보드 패널(DuckChatPanel)과
// 메신저 오리 방(MessageRoom) 두 곳이 같은 상태를 표시하므로 문구를 한 벌로 둔다 —
// 복사되면 한쪽만 고쳐진다(L-21). `duckPendingAnnounce.test.ts`가 이 단일 출처를 잠근다.
export const DUCK_PENDING_LABEL = "오리가 생각하는 중…";
