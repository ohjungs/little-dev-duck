import { pendingMigrationMessage } from "@ldd/core";

// 2026-07-26 : 오류 - 화면표시 - 공용 (Phase 37)
// 여러 화면이 `err.message`를 **그대로** 사용자에게 보여주고 있었다. 대부분은 그게 맞지만,
// **마이그레이션 대기**처럼 이미 아는 상태에서는 영문 DB 오류가 그대로 노출돼
// 사용자가 자기 잘못을 의심하게 된다(`profiles.dashboard_layout` 컬럼이 실서버에 없다).
//
// 판정은 core `pendingMigrationMessage`가 순수하게 한다. 여기는 그걸 화면 문구로 잇는 얇은 층이다 —
// 화면마다 같은 조건을 다시 쓰면 한 곳만 고쳐진다(이 저장소가 반복해서 겪은 부류).
//
// **모르는 오류는 원문을 그대로 보여준다.** 과하게 감싸면 진짜 원인을 가린다.
export function friendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw.trim() === "") return fallback;
  return pendingMigrationMessage(raw) ?? raw;
}
