import type { HeatmapDay } from "@ldd/core";

// 2026-07-27 : 습관 잔디 - 대비·경계·라벨 (2차 피드백 3-2, Phase 42 T6)
// 사용자가 "잘 안 보인다"고 했고, 실측한 원인이 넷이었다:
//   ① 셀에 테두리가 없어 같은 레벨이 인접하면 한 덩어리로 뭉친다
//   ② 레벨 0이 `--muted`라 카드 배경과 거의 같다(다크에서 지각 거리 ΔE 1.8 — 사람이 구분하는
//      최소치 2.3보다 낮으니 "거의 안 보인다"가 아니라 **못 보는 게 맞다**)
//   ③ 레벨 0~1 대비가 좁다  ④ 월·범례가 없어 어느 칸이 언제인지 알 수 없다
//
// **색은 globals.css의 `--heat-*` 한 곳에 있다.** 여기에 클래스로 박으면 검사할 수 없어서다 —
// `HabitHeatmap.contrast.test.ts`가 그 파일을 파싱해 인접 레벨의 ΔE를 잰다.
// 색을 눈으로 고르면 다음에 또 지적받는다.
//
// **셀 크기는 그대로 둔다(size-3).** 키우면 1년치가 가로로 넘친다 — 크기 조절은 성격이 달라
// Phase 44(캘린더 크기)에서 함께 다룬다.

// 범례에 쓸 레벨. 4는 "4회 이상"을 뜻한다.
const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const;

function cellStyle(count: number): React.CSSProperties {
  const level = count >= 4 ? 4 : count;
  return {
    backgroundColor: `var(--heat-${level})`,
    // 경계선. 뭉침의 **직접 원인**이라 색 대비와 별개로 필요하다.
    // border가 아니라 inset shadow인 이유: border는 셀 크기를 키워 열 정렬을 흔든다.
    boxShadow: "inset 0 0 0 1px var(--heat-edge)",
  };
}

// 그 주에 달이 시작되면 월 라벨을 붙인다(매주 붙이면 소음이다).
// **날짜 문자열에서 직접 떼어 쓴다** — Date로 바꾸면 시간대만큼 밀릴 여지가 생긴다.
function monthLabel(week: (HeatmapDay | null)[]): string | null {
  const first = week.find((d): d is HeatmapDay => d !== null);
  if (!first) return null;
  const [, month, day] = first.date.split("-");
  return Number(day) <= 7 ? `${Number(month)}월` : null;
}

export function HabitHeatmap({ data }: { data: HeatmapDay[] }) {
  // data는 오래된 날짜 → 최신 순으로 정렬돼 있다고 가정 (habitHeatmapData 출력 순서)
  // 첫 날의 요일부터 시작해 7행 그리드(일~토)로 배치한다.
  //
  // 2026-07-27 확인: 이 줄이 날짜 밀림 부류로 의심돼 확인했는데 **안전하다.** `"...T00:00:00"`은
  // **로컬 시간으로** 파싱되고 `getDay()`도 **로컬 요일**을 읽는다 — 같은 기준끼리라 시간대가
  // 상쇄된다. 위험한 조합은 UTC로 파싱해 로컬로 읽는 쪽이다(eslint가 막는 그 형태).
  // 고치지 않고 근거만 남긴다 — 없는 문제를 고치면 멀쩡한 동작을 깬다.
  const firstDow =
    data.length > 0 ? new Date(data[0].date + "T00:00:00").getDay() : 0;

  // 앞에 빈 셀을 채워 첫 주를 맞춘다 (일=0 기준)
  const padded: (HeatmapDay | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...data,
  ];

  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-x-auto">
        {/* 월 라벨. 아래 칸과 같은 폭(w-3)·같은 간격(gap-1)이어야 열이 어긋나지 않는다. */}
        <div className="flex gap-1" aria-hidden="true">
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="w-3 shrink-0 text-[9px] leading-3 text-muted-foreground"
            >
              {monthLabel(week)}
            </div>
          ))}
        </div>

        <div className="flex gap-1" role="grid" aria-label="습관 체크 히트맵">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) =>
                day === null ? (
                  <div key={di} className="size-3 rounded-sm" />
                ) : (
                  <div
                    key={day.date}
                    role="gridcell"
                    aria-label={`${day.date}: ${day.count}회`}
                    title={`${day.date}: ${day.count}회`}
                    className="size-3 rounded-sm"
                    style={cellStyle(day.count)}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 범례. 색이 무엇을 뜻하는지 없으면 잔디는 그냥 무늬다(GitHub이 넣는 이유다). */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>적음</span>
        {LEGEND_LEVELS.map((level) => (
          <span
            key={level}
            className="size-3 rounded-sm"
            style={cellStyle(level)}
            // 색 견본 자체는 낭독기에 의미가 없다 — 양옆의 "적음/많음" 글자가 그 역할을 한다.
            aria-hidden="true"
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
