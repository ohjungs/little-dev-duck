// 2026-08-02 : 스프레드시트 - 축 계산 (SPEC-2026-08-02-spreadsheet-a1 T7)
//
// T5·T6에서는 모든 칸이 같은 크기라 "n번째 칸의 시작 = n × 크기"였다. 열 너비·행 높이를
// 바꿀 수 있게 되면서 그 곱셈이 깨진다.
//
// 그렇다고 100만 행의 누적합을 만들 수는 없다(그것만 8MB다). 다행히 **예외는 희소하다** —
// meta.cols/rows는 기본값과 다른 칸만 담는다(스키마가 그렇게 정해져 있다). 그래서
// `기본 크기 × n + (n보다 앞에 있는 예외들의 차이 합)`으로 센다. 예외 목록을 한 번 정렬해
// 두고 훑으므로, 사용자가 열 몇 개를 끌어 바꾸는 실제 사용에서는 사실상 상수 시간이다.

export type AxisOverrides = Record<string, { w?: number; h?: number }>;

export interface Axis {
  /** i번째 칸이 시작하는 픽셀. */
  at(i: number): number;
  /** i번째 칸의 크기. */
  size(i: number): number;
  /** 이 픽셀 위치에 있는 칸 번호(음수는 0으로 접는다). */
  indexAt(px: number): number;
}

export function buildAxis(overrides: AxisOverrides, defaultSize: number): Axis {
  // [칸 번호, 크기] 목록을 번호순으로. 크기 키는 열이면 w, 행이면 h다.
  const list: { i: number; size: number }[] = [];
  for (const [key, value] of Object.entries(overrides)) {
    const i = Number(key);
    const size = value.w ?? value.h;
    if (!Number.isInteger(i) || i < 0 || size === undefined) continue;
    list.push({ i, size });
  }
  list.sort((a, b) => a.i - b.i);

  const sizeOf = (i: number): number =>
    list.find((x) => x.i === i)?.size ?? defaultSize;

  const at = (i: number): number => {
    let extra = 0;
    for (const x of list) {
      if (x.i >= i) break;
      extra += x.size - defaultSize;
    }
    return i * defaultSize + extra;
  };

  return {
    at,
    size: sizeOf,
    indexAt(px: number): number {
      if (px <= 0) return 0;
      // 예외가 없으면 나눗셈 한 번이다. 있으면 그 앞까지 나눗셈으로 건너뛰고 그 뒤부터 훑는다.
      let i = 0;
      let pos = 0;
      for (const x of list) {
        if (x.i < i) continue;
        // 예외 앞까지는 기본 크기로 건너뛴다.
        const before = x.i - i;
        if (pos + before * defaultSize > px) break;
        pos += before * defaultSize;
        i = x.i;
        if (pos + x.size > px) return i;
        pos += x.size;
        i += 1;
      }
      return i + Math.floor((px - pos) / defaultSize);
    },
  };
}
