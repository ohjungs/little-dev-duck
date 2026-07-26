import { buildBarChart, describeBarChart, type BarPoint } from "@ldd/core";

// 2026-07-27 : 통계 - 차트 (2차 피드백 3-1, Phase 46 T1)
// **차트 라이브러리를 들이지 않았다.** 계획이 ponytail 사다리를 태워 내린 결론이고
// (4단계 "플랫폼 네이티브" = SVG), 우리 데이터는 일별 카운트뿐이다. `recharts`는 번들이 크고
// 대시보드 첫 화면 성능에 바로 영향을 준다 — **의존성 0개.**
//
// 계산(눈금·비율·요약)은 전부 core `buildBarChart`에 있다. 여기서는 그리기만 한다 —
// JSX 안에 계산을 섞으면 검사할 수 없다(잔디 색에서 세운 것과 같은 판단).
//
// 접근성: 그림만 있는 차트는 보조기기에 **아무 정보도 아니다.** `role="img"` + 한 줄 요약을
// 붙이고, 막대마다 `<title>`로 값을 준다(마우스 툴팁도 공짜로 얻는다).

// viewBox 좌표계. 실제 크기는 CSS가 정한다(고정 픽셀을 쓰면 좁은 화면에서 잘린다).
const VIEW_W = 300;
const VIEW_H = 90;
const GAP_RATIO = 0.25;

export function BarChart({
  points,
  unit = "회",
  ariaLabel,
}: {
  points: BarPoint[];
  unit?: string;
  ariaLabel: string;
}) {
  const scale = buildBarChart(points);
  if (scale.bars.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        이 기간에는 기록이 없어요.
      </p>
    );
  }

  const slot = VIEW_W / scale.bars.length;
  const barWidth = slot * (1 - GAP_RATIO);

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-24 w-full"
        role="img"
        aria-label={`${ariaLabel}. ${describeBarChart(scale, unit)}`}
        preserveAspectRatio="none"
      >
        {/* 눈금선. 0선까지 그려야 막대가 어디서 시작하는지 보인다. */}
        {scale.ticks.map((t) => {
          const y = VIEW_H - (t / scale.max) * VIEW_H;
          return (
            <line
              key={t}
              x1={0}
              x2={VIEW_W}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-border"
            />
          );
        })}
        {scale.bars.map((b, i) => {
          // 값이 0이면 막대를 그리지 않는다 — 1px 선을 남기면 "조금 했다"로 보인다.
          const h = b.ratio * VIEW_H;
          if (h <= 0) return null;
          return (
            <rect
              key={b.point.label}
              x={i * slot + (slot - barWidth) / 2}
              y={VIEW_H - h}
              width={barWidth}
              height={h}
              rx={1}
              className="fill-primary"
            >
              <title>{`${b.point.label}: ${b.point.value}${unit}`}</title>
            </rect>
          );
        })}
      </svg>
      {/* 축 라벨은 양 끝만 — 90칸에 날짜를 다 쓰면 읽을 수 없다. */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{scale.bars[0]!.point.label}</span>
        <span>최대 {scale.max}{unit}</span>
        <span>{scale.bars[scale.bars.length - 1]!.point.label}</span>
      </div>
    </figure>
  );
}
