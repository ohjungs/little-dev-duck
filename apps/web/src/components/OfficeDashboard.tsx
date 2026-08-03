"use client";

// 2026-07-24 : Phase F — 전사 대시보드 (CEO 사장실 책상 앞 오버레이)

import { formatClockTime, type Npc, type GameClock,
  deptColor,
  deptLabel,
  hasActiveWork,
  npcStatusLabel,
} from "@ldd/core";

import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  npcs: Npc[];
  clock: GameClock;
  onClose: () => void;
};

export function OfficeDashboard({ npcs, clock, onClose }: Props) {
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

  // 부서별 그룹핑
  const byDept = new Map<string, Npc[]>();
  for (const npc of npcs) {
    const list = byDept.get(npc.department) ?? [];
    list.push(npc);
    byDept.set(npc.department, list);
  }

  // 최근 완료 활동 피드 (모든 NPC의 recentDone 합산, 부서 색 표시)
  const activityFeed = npcs
    .flatMap((n) => n.recentDone.map((t) => ({ npc: n, task: t })))
    .slice(0, 20);

  const totalWorking = npcs.filter((n) => n.schedulePhase === "working").length;
  const totalActiveTasks = npcs.flatMap((n) => n.tasks.filter((t) => t.status === "active")).length;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="전사 대시보드"
      tabIndex={-1}
      className="absolute inset-4 bg-background/95 backdrop-blur border border-border rounded-xl shadow-2xl z-50 overflow-y-auto"
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur">
        <div>
          <h2 className="font-bold text-base">전사 대시보드</h2>
          <p className="text-xs text-muted-foreground">
            {formatClockTime(clock)} · 전체 {npcs.length}명 · 근무 중 {totalWorking}명 · 진행 중 태스크 {totalActiveTasks}건
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="대시보드 닫기"
          className="text-muted-foreground hover:text-foreground text-xl px-2 leading-none"
        >
          x
        </button>
      </div>

      {/* 부서별 카드 그리드 */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...byDept.entries()].map(([dept, deptNpcs]) => {
          const activeTasks = deptNpcs.flatMap((n) =>
            n.tasks.filter((t) => t.status === "active"),
          );
          const avgProgress =
            activeTasks.length > 0
              ? activeTasks.reduce((s, t) => s + t.progress, 0) / activeTasks.length
              : 0;
          const working = deptNpcs.filter((n) => n.schedulePhase === "working").length;
          const color = deptColor(dept);

          return (
            <div key={dept} className="border border-border rounded-lg p-3">
              {/* 부서 헤더 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-semibold text-sm">{deptLabel(dept)}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {working}/{deptNpcs.length}명 근무
                </span>
              </div>

              {/* 진행 중 건수 + 진행률 바 */}
              <div className="text-xs text-muted-foreground mb-1">
                진행 중 {activeTasks.length}건
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${avgProgress}%`, backgroundColor: color }}
                />
              </div>

              {/* 팀원 목록 */}
              <div className="mt-2 space-y-0.5">
                {deptNpcs.map((n) => (
                  <div key={n.id} className="text-xs flex justify-between">
                    <span>{n.name}</span>
                    <span className="text-muted-foreground">
                      {npcStatusLabel(n.schedulePhase, hasActiveWork(n))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 최근 활동 피드 */}
      <div className="p-4 border-t border-border">
        <h3 className="font-semibold text-sm mb-2">최근 활동</h3>
        {activityFeed.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 완료된 작업이 없습니다.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {activityFeed.map((item, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span style={{ color: deptColor(item.npc.department) }}>
                  [{deptLabel(item.npc.department)}]
                </span>{" "}
                {item.npc.name} — {item.task.title} 완료
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 헬퍼 — OfficeTalkPanel과 동일한 인라인 매핑
// ---------------------------------------------------------------------------
