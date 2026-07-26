// 2026-07-26 : 대시보드 - 배치 - 순서·표시 (피드백 1-2·1-5)
// "대쉬보드 구성을 바꿀수있으면 좋겠고 카드형식으로 움직일수있으면 좋겠어",
// "카드 형태의 대쉬보드 내 기능들을 보이거나 안보이게하는 기능을 관리자 기능안에 넣었으면해".
//
// 저장 규약을 여기서 못박는다. 화면이 아니라 이 파일이 단일 출처다.
//
// 저장하는 것은 **순서 배열 하나와 숨김 배열 하나**다. "보이는 것만 순서대로" 저장하지 않는다 —
// 그러면 카드를 숨겼다가 다시 켤 때 원래 자리를 잃고 항상 맨 뒤로 간다.
//
// 저장된 목록과 실제 위젯 목록은 어긋날 수 있다(위젯을 새로 만들거나 지운 뒤). 그 어긋남을
// 화면이 매번 다시 처리하지 않도록 여기서 흡수한다:
//   · 저장에 없는 새 위젯 → 뒤에 붙이고 보이게 한다(만들었는데 아무도 못 보면 없는 것과 같다)
//   · 저장에 있는데 사라진 위젯 → 조용히 버린다

export type DashboardLayout = {
  // 위젯 id를 원하는 순서로. 여기 없는 위젯은 뒤에 붙는다.
  order: string[];
  // 숨긴 위젯 id. 순서 정보는 order에 그대로 남는다.
  hidden: string[];
};

export const EMPTY_LAYOUT: DashboardLayout = { order: [], hidden: [] };

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string" && v.length > 0 && !out.includes(v)) out.push(v);
  }
  return out;
}

// DB(jsonb)에서 읽은 값을 배치로. 어떤 쓰레기가 들어와도 throw하지 않는다 —
// 배치 하나가 깨졌다고 대시보드 전체가 죽으면 안 된다.
export function parseDashboardLayout(value: unknown): DashboardLayout {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_LAYOUT;
  const v = value as Record<string, unknown>;
  return { order: stringArray(v.order), hidden: stringArray(v.hidden) };
}

// 실제 위젯 목록에 저장된 배치를 적용해 "그릴 순서"를 만든다.
// available의 순서가 기본값이다(코드가 정한 기본 배치).
export function resolveOrder(
  available: readonly string[],
  layout: DashboardLayout,
): string[] {
  const exists = new Set(available);
  // 저장된 순서 중 실재하는 것만. **중복도 여기서 걸러낸다** — parseDashboardLayout이 이미
  // 중복을 없애지만, 그걸 거치지 않고 만든 배치(예전 저장값·직접 조립)가 들어올 수 있고
  // 같은 id가 두 번 나오면 화면에서 React key가 겹쳐 렌더가 깨진다.
  const ordered: string[] = [];
  const placed = new Set<string>();
  for (const id of layout.order) {
    if (exists.has(id) && !placed.has(id)) {
      ordered.push(id);
      placed.add(id);
    }
  }
  // 저장에 없던 위젯은 **기본 순서를 유지한 채** 뒤에 붙인다
  for (const id of available) {
    if (!placed.has(id)) ordered.push(id);
  }
  return ordered;
}

export function isHidden(layout: DashboardLayout, id: string): boolean {
  return layout.hidden.includes(id);
}

// 숨김 토글. 순서는 건드리지 않는다(다시 켜면 제자리로 돌아오게).
export function toggleHidden(layout: DashboardLayout, id: string): DashboardLayout {
  return {
    order: [...layout.order],
    hidden: layout.hidden.includes(id)
      ? layout.hidden.filter((x) => x !== id)
      : [...layout.hidden, id],
  };
}

// 카드를 한 칸 옮긴다. 저장된 order가 비어 있거나 일부만 있어도 동작하도록,
// **해소된 전체 순서를 기준으로** 계산한 뒤 그 결과를 통째로 저장한다.
// (부분 저장 상태에서 인덱스를 세면 화면에 보이는 위치와 어긋난다.)
export function moveWidget(
  available: readonly string[],
  layout: DashboardLayout,
  id: string,
  direction: "up" | "down",
): DashboardLayout {
  const order = resolveOrder(available, layout);
  const from = order.indexOf(id);
  if (from === -1) return layout;
  const to = direction === "up" ? from - 1 : from + 1;
  // 양 끝에서 더 밀면 아무 일도 없다(순환시키면 맨 위에서 한 번 더 눌렀을 때 맨 아래로 튄다).
  if (to < 0 || to >= order.length) return layout;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return { order: next, hidden: [...layout.hidden] };
}

// 2026-07-27 : 대시보드 - 배치 - 끌어다 놓기 (2차 피드백 1-5, Phase 44 T2)
// `moveWidget`은 한 칸씩만 옮긴다. 드래그는 **임의 위치로 한 번에** 옮기므로 별도 계산이 필요하다.
// 화면에서 배열을 직접 주무르지 않는 이유는 `moveWidget`과 같다 — 순서 계산이 두 벌이 되면
// 대시보드와 설정 화면이 서로 다른 순서를 보여 준다.
//
// **끼워 넣기(insert)지 자리 바꾸기(swap)가 아니다.** 드래그는 "여기로 가져다 놓는다"는
// 동작이라, 스왑하면 놓은 자리의 카드가 원래 자리로 튀어 사용자가 기대한 결과와 달라진다.
export function reorderWidget(
  available: readonly string[],
  layout: DashboardLayout,
  id: string,
  toIndex: number,
): DashboardLayout {
  const order = resolveOrder(available, layout);
  const from = order.indexOf(id);
  if (from === -1) return layout;
  // 범위를 벗어난 목적지는 양 끝으로 눌러 담는다(드롭 좌표는 목록 밖에서도 올 수 있다).
  const to = Math.min(Math.max(toIndex, 0), order.length - 1);
  if (to === from) return layout;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return { order: next, hidden: [...layout.hidden] };
}

// 실제로 그릴 위젯 id 목록(순서 적용 + 숨김 제외).
export function visibleWidgets(
  available: readonly string[],
  layout: DashboardLayout,
): string[] {
  return resolveOrder(available, layout).filter((id) => !isHidden(layout, id));
}
