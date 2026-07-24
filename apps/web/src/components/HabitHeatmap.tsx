import type { HeatmapDay } from "@ldd/core";

// 색상 레벨: 0=없음, 1=연함, 2=보통, 3=진함, 4+=최고
function colorClass(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count === 2) return "bg-green-400 dark:bg-green-700";
  if (count === 3) return "bg-green-500 dark:bg-green-600";
  return "bg-green-700 dark:bg-green-400";
}

export function HabitHeatmap({ data }: { data: HeatmapDay[] }) {
  // data는 오래된 날짜 → 최신 순으로 정렬돼 있다고 가정 (habitHeatmapData 출력 순서)
  // 첫 날의 요일부터 시작해 7행 그리드(월~일)로 배치한다.
  const firstDow = data.length > 0 ? new Date(data[0].date + "T00:00:00").getDay() : 0;

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
    <div
      className="flex gap-1 overflow-x-auto"
      role="grid"
      aria-label="습관 체크 히트맵"
    >
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
                className={`size-3 rounded-sm ${colorClass(day.count)}`}
              />
            ),
          )}
        </div>
      ))}
    </div>
  );
}
