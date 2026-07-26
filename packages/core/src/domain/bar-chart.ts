// 2026-07-27 : 통계 - 차트 (2차 피드백 3-1, Phase 46 T1)
// **라이브러리를 들이지 않는다.** 계획이 ponytail 사다리를 태워 내린 결론이고(4단계 "플랫폼
// 네이티브" = SVG), 우리 데이터는 **일별 카운트**뿐이라 축·막대 계산이 몇십 줄이면 된다.
// `recharts`는 번들이 크고 대시보드 첫 화면 성능에 바로 영향을 준다.
//
// **계산을 컴포넌트에 두지 않는 이유**: 막대 높이·눈금 값은 순수 계산인데 JSX 안에 섞이면
// 검사할 수 없다. 이 저장소가 잔디 색(Phase 42 T6)에서 세운 것과 같은 판단이다.

export interface BarPoint {
  label: string;
  value: number;
}

export interface BarLayout {
  // 0~1로 정규화한 막대 높이. 화면이 픽셀로 곱해 쓴다(높이를 여기서 정하면 반응형이 막힌다).
  ratio: number;
  point: BarPoint;
}

export interface ChartScale {
  // 눈금 최댓값. 데이터 최댓값을 **보기 좋은 수로 올림**한 값이다.
  max: number;
  // 가로선을 그을 값들(0 포함, 오름차순).
  ticks: number[];
  bars: BarLayout[];
}

// 1·2·5·10·20·50… 중 데이터를 담는 가장 작은 값. 축이 7·13 같은 어중간한 수로 끝나지 않게 한다.
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * base;
    if (value <= candidate) return candidate;
  }
  return 10 * base;
}

/**
 * 막대 그래프에 필요한 값을 전부 계산한다. **순수 함수** — 픽셀도 색도 모른다.
 *
 * 계약:
 * - 값이 전부 0이어도 **눈금이 1로 잡힌다**(0으로 나누지 않고, 축이 비지 않는다).
 * - 음수는 0으로 본다 — 카운트 데이터에 음수가 오는 것은 상류의 결함이고,
 *   여기서 아래로 뻗는 막대를 그리면 그 결함이 그럴듯해 보인다.
 * - 눈금 수는 요청값을 지키되 **중복 없이** 만든다(최댓값이 작으면 눈금이 겹친다).
 */
export function buildBarChart(
  points: readonly BarPoint[],
  tickCount = 3,
): ChartScale {
  const safe = points.map((p) => ({
    ...p,
    value: Number.isFinite(p.value) && p.value > 0 ? p.value : 0,
  }));
  const max = niceMax(Math.max(0, ...safe.map((p) => p.value)));
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i += 1) {
    const v = Math.round((max / tickCount) * i);
    if (!ticks.includes(v)) ticks.push(v);
  }
  return {
    max,
    ticks,
    bars: safe.map((point) => ({ point, ratio: point.value / max })),
  };
}

/** 화면 낭독기에 읽어 줄 한 줄 요약. 그림만 있는 차트는 보조기기에 아무 정보도 아니다. */
export function describeBarChart(
  scale: ChartScale,
  unit = "회",
): string {
  if (scale.bars.length === 0) return "표시할 데이터가 없습니다.";
  const total = scale.bars.reduce((n, b) => n + b.point.value, 0);
  let peak = scale.bars[0]!;
  for (const b of scale.bars) if (b.point.value > peak.point.value) peak = b;
  return `${scale.bars.length}개 구간, 합계 ${total}${unit}, 최고 ${peak.point.label} ${peak.point.value}${unit}.`;
}
