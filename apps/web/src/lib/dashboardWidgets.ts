import type { FeatureKey } from "@ldd/core";

// 2026-07-26 : 대시보드 - 위젯목록 - 단일출처 (피드백 1-2·1-5)
// 대시보드(그리는 쪽)와 관리 화면(순서·숨김을 정하는 쪽)이 각자 목록을 들면 반드시 갈라진다.
// 위젯을 하나 추가했는데 관리 화면에 안 뜨면 사용자는 그걸 끌 수 없고, 반대면 있지도 않은
// 카드를 옮기게 된다. 이 저장소는 같은 부류(부서 표 3중 하드코딩)를 이미 한 번 겪었다.
//
// id는 **저장되는 값**이다(dashboard_layout.order/hidden). 바꾸면 기존 배치가 끊기므로
// 이름을 바꾸지 말고 새 id를 추가한다.
//
// feature는 이 카드가 어떤 기능 토글에 묶이는지다. 관리자가 그 기능을 끄면 카드도 사라진다 —
// 없으면(null) 토글 대상이 아니고 개인 숨김으로만 제어된다.

export type DashboardWidgetMeta = {
  id: string;
  label: string;
  feature: FeatureKey | null;
};

export const DASHBOARD_WIDGETS: readonly DashboardWidgetMeta[] = [
  { id: "duck", label: "오리", feature: null },
  { id: "chat", label: "오리 채팅", feature: "duck-chat" },
  { id: "todo", label: "할 일", feature: "todo" },
  { id: "habit", label: "습관", feature: "habit" },
  { id: "pomodoro", label: "뽀모도로", feature: "pomodoro" },
  { id: "memo", label: "메모", feature: "memo" },
  { id: "calendar", label: "캘린더", feature: "calendar" },
  // 2026-08-01 : 대시보드 - 커밋 잔디 복귀 (e2e가 드러낸 제품 공백)
  // **제품 한 줄 정의가 "위젯 모드(오리 + 투두 + 메모 + 커밋 잔디)"인데 커밋 잔디만 없었다**
  // (CLAUDE.md 1절). 위젯은 만들어져 있었지만 그리는 곳이 **설정 화면 한 곳뿐**이라,
  // 대시보드를 여는 사용자에게는 없는 기능이었다.
  //
  // 드러난 경로가 특이하다: e2e 9건이 계속 "홈에서 GitHub 위젯이 안 보인다"고 실패했는데,
  // 세션이 없어 전부 스킵되던 동안에는 아무도 그 말을 듣지 못했다. 자동 로그인을 붙이자
  // 바로 나왔다 — **스펙이 맞았고 화면이 틀려 있었다.**
  { id: "github", label: "커밋 잔디", feature: "github" },
  { id: "news-top", label: "오늘의 뉴스", feature: "news-top" },
];
