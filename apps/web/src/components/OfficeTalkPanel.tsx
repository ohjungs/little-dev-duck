"use client";

// 2026-07-24 : Phase F — NPC 상세 대화 패널 (React 오버레이, 하단 시트 모바일)

import Link from "next/link";

import { deptColor, deptLabel, describeTaskSource, hasActiveWork, npcStatusLabel } from "@ldd/core";
import type { Npc } from "@ldd/core";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  npc: Npc;
  onClose: () => void;
};

export function OfficeTalkPanel({ npc, onClose }: Props) {
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);
  const activeTasks = npc.tasks.filter((t) => t.status === "active");
  const waitingTasks = npc.tasks.filter((t) => t.status === "waiting");

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${npc.name} 대화 패널`}
      tabIndex={-1}
      className="absolute inset-x-0 bottom-0 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-96
                 bg-background border border-border rounded-t-xl md:rounded-xl shadow-2xl z-50
                 max-h-[60vh] overflow-y-auto"
    >
      {/* 헤더 */}
      <div
        className="p-3 border-b border-border"
        style={{ borderTopWidth: 3, borderTopStyle: "solid", borderTopColor: deptColor(npc.department) }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm">{npc.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {deptLabel(npc.department)} · {npc.role}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted-foreground hover:text-foreground text-lg leading-none px-1"
          >
            x
          </button>
        </div>
        <div className="text-xs mt-1 text-muted-foreground">
          {npcStatusLabel(npc.schedulePhase, hasActiveWork(npc))} · {getMoodLabel(npc.mood)}
        </div>
      </div>

      {/* 진행 중 태스크 */}
      <div className="p-3">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">현재 작업</h4>
        {activeTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {npc.schedulePhase === "lunch" ? "점심 식사 중" :
             npc.schedulePhase === "break" ? "잠깐 휴식 중" :
             npc.schedulePhase === "offwork" || npc.schedulePhase === "leaving" ? "퇴근 완료" :
             "작업 없음"}
          </p>
        ) : (
          activeTasks.map((task) => {
            // 2026-07-27 : 오피스 - 원천 표시 (2차 피드백 5-2, Phase 48 T2)
            // 전에는 **id가 "real-"로 시작하는지**로 실제 업무를 추측하고 "내 업무"라고만 적었다.
            // 그건 문자열 규칙에 기댄 추측이고, **어디서 온 일인지는 여전히 못 밝혔다.**
            // 이제 업무가 `source`를 직접 들고 오므로 그 값을 그대로 쓴다 — 이게 계획이 말한
            // "원천을 밝히는 것"이다. 근거 없이 "일하는 중"이라고만 하면 1차 5-7과 같아진다.
            //
            // 원본으로 데려가는 링크는 **개별 주소가 실제로 있는 것에만** 건다(지금은 문서뿐).
            // 나머지를 홈으로 보내면 "원본으로 이동"이 아니라 그냥 홈이다 — 가짜 링크는 안 만든다.
            const sourceHref =
              task.source === "page" && task.sourceId ? `/pages/${task.sourceId}` : null;
            return (
              <div key={task.id} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs">
                  <span className="truncate mr-2 flex items-center gap-1">
                    {task.source && (
                      <span
                        className="shrink-0 rounded px-1 text-[9px] font-bold text-white"
                        style={{ backgroundColor: deptColor(npc.department) }}
                      >
                        {describeTaskSource(task.source)}
                      </span>
                    )}
                    {sourceHref ? (
                      <Link href={sourceHref} className="truncate underline hover:no-underline">
                        {task.title}
                      </Link>
                    ) : (
                      <span className="truncate">{task.title}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0">{Math.round(task.progress)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: deptColor(npc.department),
                    }}
                  />
                </div>
              </div>
            );
          })
        )}

        {/* 대기 태스크 */}
        {waitingTasks.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">대기 중</h4>
            {waitingTasks.map((task) => (
              <div key={task.id} className="text-xs text-muted-foreground mb-0.5">
                - {task.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최근 완료 */}
      {npc.recentDone.length > 0 && (
        <div className="px-3 pb-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">최근 완료</h4>
          {npc.recentDone.map((t) => (
            <div key={t.id} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500">✓</span>
              <span>{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼
          2026-07-26 (피드백 5-5): "수고했어" 버튼 제거. 누르면 만족도가 +5 됐는데 그 만족도는
          아무 데도 영향을 주지 않는 숫자였다 — 눌러도 실제로 달라지는 게 없는 버튼이었다. */}
      <div className="p-3 pt-0 flex gap-2 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 text-xs py-1.5 rounded border border-border hover:bg-accent transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 헬퍼 — 인라인 매핑 (DEPT_REGISTRY import 불필요, 렌더 경로 단순화)
// ---------------------------------------------------------------------------
function getMoodLabel(mood: string): string {
  const labels: Record<string, string> = {
    happy:    "기분 좋음",
    neutral:  "보통",
    stressed: "바쁨",
    tired:    "피곤함",
  };
  return labels[mood] ?? mood;
}
