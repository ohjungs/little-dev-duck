"use client";

// 2026-07-24 : Phase F — NPC 상세 대화 패널 (React 오버레이, 하단 시트 모바일)

import type { Npc } from "@ldd/core";

type Props = {
  npc: Npc;
  onClose: () => void;
  onEncourage?: (npc: Npc) => void;
};

export function OfficeTalkPanel({ npc, onClose, onEncourage }: Props) {
  const activeTasks = npc.tasks.filter((t) => t.status === "active");
  const waitingTasks = npc.tasks.filter((t) => t.status === "waiting");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${npc.name} 대화 패널`}
      className="absolute inset-x-0 bottom-0 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-96
                 bg-background border border-border rounded-t-xl md:rounded-xl shadow-2xl z-50
                 max-h-[60vh] overflow-y-auto"
    >
      {/* 헤더 */}
      <div
        className="p-3 border-b border-border"
        style={{ borderTopWidth: 3, borderTopStyle: "solid", borderTopColor: getDeptColor(npc.department) }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm">{npc.name}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {getDeptLabel(npc.department)} · {npc.role}
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
          {getStatusLabel(npc.schedulePhase)} · {getMoodLabel(npc.mood)}
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
          activeTasks.map((task) => (
            <div key={task.id} className="mb-2 last:mb-0">
              <div className="flex justify-between text-xs">
                <span className="truncate mr-2">{task.title}</span>
                <span className="text-muted-foreground shrink-0">{Math.round(task.progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${task.progress}%`,
                    backgroundColor: getDeptColor(npc.department),
                  }}
                />
              </div>
            </div>
          ))
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

      {/* 액션 버튼 */}
      <div className="p-3 pt-0 flex gap-2 border-t border-border">
        {onEncourage && (
          <button
            type="button"
            onClick={() => onEncourage(npc)}
            className="flex-1 text-xs py-1.5 rounded border border-border hover:bg-accent transition-colors"
          >
            수고했어
          </button>
        )}
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
function getDeptColor(dept: string): string {
  const colors: Record<string, string> = {
    engineering: "#4A90D9",
    marketing:   "#E84C3D",
    design:      "#9B59B6",
    hr:          "#2ECC71",
    finance:     "#2C3E50",
    sales:       "#E67E22",
    support:     "#1ABC9C",
    qa:          "#F1C40F",
    operations:  "#95A5A6",
  };
  return colors[dept] ?? "#888";
}

function getDeptLabel(dept: string): string {
  const labels: Record<string, string> = {
    engineering: "개발팀",
    marketing:   "마케팅팀",
    design:      "디자인팀",
    hr:          "인사팀",
    finance:     "재무팀",
    sales:       "영업팀",
    support:     "고객지원팀",
    qa:          "QA팀",
    operations:  "운영팀",
  };
  return labels[dept] ?? dept;
}

function getStatusLabel(phase: string): string {
  const labels: Record<string, string> = {
    working:    "업무 중",
    lunch:      "점심 시간",
    break:      "휴식 중",
    commuting:  "출근 중",
    leaving:    "퇴근 중",
    offwork:    "퇴근",
  };
  return labels[phase] ?? phase;
}

function getMoodLabel(mood: string): string {
  const labels: Record<string, string> = {
    happy:    "기분 좋음",
    neutral:  "보통",
    stressed: "바쁨",
    tired:    "피곤함",
  };
  return labels[mood] ?? mood;
}
