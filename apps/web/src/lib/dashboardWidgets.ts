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
  { id: "news-top", label: "오늘의 뉴스", feature: "news-top" },
];
