"use client";

// 2026-07-24 : OfficeManagementPanel — 경영 관리 사이드 패널 (Office Management 101 스타일).
// TAB 키 또는 관리 버튼으로 열림. 우측 슬라이드인, 모바일 전체화면 오버레이.

import { useState } from "react";
import {
  formatMoney,
  reputationStars,
  type CompanyStats,
  type Npc,
  type GameClock,
} from "@ldd/core";
import { formatClockTime } from "@ldd/core";

type Props = {
  company: CompanyStats;
  npcs: Npc[];
  clock: GameClock;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// 헬퍼
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

function satisfactionEmoji(val: number): string {
  if (val >= 80) return "😊";
  if (val >= 50) return "😐";
  return "😞";
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------
export function OfficeManagementPanel({ company, npcs, clock, onClose }: Props) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // 부서별 그룹핑
  const byDept = new Map<string, Npc[]>();
  for (const npc of npcs) {
    const list = byDept.get(npc.department) ?? [];
    list.push(npc);
    byDept.set(npc.department, list);
  }

  // 전체 생산성 평균
  const avgProductivity =
    npcs.length > 0
      ? Math.round(npcs.reduce((s, n) => s + n.productivity, 0) / npcs.length)
      : 0;

  // 오늘의 성과
  const totalTasksToday = npcs.reduce((s, n) => s + n.tasksCompleted, 0);
  const mvp = npcs.reduce<Npc | null>(
    (best, n) => (!best || n.tasksCompleted > best.tasksCompleted ? n : best),
    null,
  );
  const topDeptEntry = [...byDept.entries()].reduce<[string, number] | null>(
    (best, [dept, members]) => {
      const avg = Math.round(members.reduce((s, n) => s + n.productivity, 0) / members.length);
      return !best || avg > best[1] ? [dept, avg] : best;
    },
    null,
  );

  // 평판 별 렌더
  const stars = reputationStars(company.reputation);
  const starDisplay = "★".repeat(stars) + "☆".repeat(5 - stars);

  return (
    <>
      {/* 딤 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 패널 본체 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="경영 관리 패널"
        className="absolute inset-y-0 right-0 z-50 flex flex-col
                   w-full sm:w-80
                   bg-gray-900/95 border-l border-gray-700
                   overflow-y-auto
                   text-gray-100"
        style={{ backdropFilter: "blur(8px)" }}
      >
        {/* ── 헤더: 회사 요약 ── */}
        <div className="sticky top-0 bg-gray-900/98 border-b border-gray-700 px-3 py-2.5 z-10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs font-bold text-yellow-300 tracking-wide">
              Little Dev Duck Corp
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="관리 패널 닫기"
              className="text-gray-400 hover:text-white text-base leading-none px-1 py-0.5
                         border border-gray-600 hover:border-gray-400 rounded transition-colors"
            >
              x
            </button>
          </div>

          {/* 자금 / 수익 / 지출 */}
          <div className="flex gap-3 font-mono text-xs">
            <div>
              <span className="text-gray-400">자금 </span>
              <span className="text-green-400 font-bold">₩{formatMoney(company.money)}</span>
            </div>
            <div>
              <span className="text-gray-400">수익 </span>
              <span className="text-blue-400">₩{formatMoney(company.revenue)}/h</span>
            </div>
            <div>
              <span className="text-gray-400">지출 </span>
              <span className="text-red-400">₩{formatMoney(company.expenses)}/h</span>
            </div>
          </div>

          {/* 평판 + 시계 */}
          <div className="flex items-center justify-between mt-1">
            <div className="font-mono text-xs">
              <span className="text-yellow-400">{starDisplay}</span>
              <span className="text-gray-400 ml-1">({company.reputation}/100)</span>
            </div>
            <div className="font-mono text-xs text-gray-400">
              {formatClockTime(clock)} · {npcs.length}명
            </div>
          </div>
        </div>

        {/* ── 섹션: 부서 현황 ── */}
        <div className="px-3 pt-3">
          <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            부서 현황
          </h3>

          <div className="space-y-1.5">
            {[...byDept.entries()].map(([dept, members]) => {
              const deptAvgProd = Math.round(
                members.reduce((s, n) => s + n.productivity, 0) / members.length,
              );
              const working = members.filter((n) => n.schedulePhase === "working").length;
              const color = getDeptColor(dept);
              const isExpanded = expandedDept === dept;

              return (
                <div key={dept} className="border border-gray-700 rounded overflow-hidden">
                  {/* 부서 행 */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left
                               hover:bg-gray-800 transition-colors"
                    onClick={() => setExpandedDept(isExpanded ? null : dept)}
                    aria-expanded={isExpanded}
                  >
                    <span className="font-mono text-xs" style={{ color }}>
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span className="font-mono text-xs flex-1 text-gray-200">
                      {getDeptLabel(dept)}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {working}/{members.length}
                    </span>
                    <span className="font-mono text-xs w-8 text-right" style={{ color }}>
                      {deptAvgProd}%
                    </span>
                  </button>

                  {/* 생산성 바 */}
                  <div className="px-2 pb-1.5">
                    <ProgressBar value={deptAvgProd} color={color} />
                  </div>

                  {/* 직원 목록 (확장) */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 bg-gray-800/50">
                      <div className="px-2 py-1 flex font-mono text-[10px] text-gray-500 border-b border-gray-700">
                        <span className="flex-1">이름</span>
                        <span className="w-14">만족도</span>
                        <span className="w-14 text-right">급여</span>
                        <span className="w-12 text-right">완료</span>
                      </div>
                      {members.map((npc) => (
                        <div
                          key={npc.id}
                          className="px-2 py-0.5 flex font-mono text-[10px] text-gray-300
                                     hover:bg-gray-700/50 transition-colors"
                        >
                          <span className="flex-1 truncate">{npc.name}</span>
                          <span className="w-14">
                            {satisfactionEmoji(npc.satisfaction)}{" "}
                            <span className="text-gray-400">{npc.satisfaction}</span>
                          </span>
                          <span className="w-14 text-right text-gray-400">
                            ₩{formatMoney(npc.salary)}/h
                          </span>
                          <span className="w-12 text-right text-gray-400">
                            {npc.tasksCompleted}건
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 섹션: 오늘의 성과 ── */}
        <div className="px-3 pt-4 pb-4">
          <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            오늘의 성과
          </h3>

          <div className="border border-gray-700 rounded px-3 py-2.5 space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-gray-400">완료 작업</span>
              <span className="text-white font-bold">{totalTasksToday}건</span>
            </div>

            <div className="flex justify-between font-mono text-xs">
              <span className="text-gray-400">전사 생산성</span>
              <span className="font-bold" style={{ color: avgProductivity >= 70 ? "#4ade80" : avgProductivity >= 40 ? "#facc15" : "#f87171" }}>
                {avgProductivity}%
              </span>
            </div>

            {topDeptEntry && (
              <div className="flex justify-between font-mono text-xs">
                <span className="text-gray-400">최고 생산성</span>
                <span style={{ color: getDeptColor(topDeptEntry[0]) }}>
                  {getDeptLabel(topDeptEntry[0])} ({topDeptEntry[1]}%)
                </span>
              </div>
            )}

            {mvp && mvp.tasksCompleted > 0 && (
              <div className="flex justify-between font-mono text-xs">
                <span className="text-gray-400">MVP</span>
                <span className="text-yellow-300">
                  {mvp.name} ({mvp.tasksCompleted}건)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 하단: 닫기 힌트 ── */}
        <div className="mt-auto px-3 pb-3">
          <p className="font-mono text-[10px] text-gray-600 text-center">
            TAB / ESC / X 로 닫기
          </p>
        </div>
      </div>
    </>
  );
}
