// 표 뷰에 보일 행이 하나도 없을 때의 안내 문구.
//
// 2026-07-26 : 데이터베이스 - 표뷰 - 빈상태정확성
// 표는 필터·정렬을 거친 행만 받는다(DatabaseView의 visibleRows). 그래서 필터가 전부 걸러낸
// 경우에도 "아직 행이 없습니다"가 떠서, 행이 20개 있는데도 없다고 말하는 상태였다.
// 원본 개수와 필터 유무를 함께 보고 사실대로 말한다.

export function dbEmptyMessage(input: {
  total: number; // 필터 적용 전 행 개수
  hasFilters: boolean;
}): string {
  if (input.hasFilters && input.total > 0) {
    return `필터에 맞는 행이 없어요. 전체 ${input.total}개 중 0개 표시 중 — 위 "필터"에서 조건을 바꿔보세요.`;
  }
  return '아직 행이 없어요. 아래 "새 행"으로 첫 줄을 추가해보세요.';
}
