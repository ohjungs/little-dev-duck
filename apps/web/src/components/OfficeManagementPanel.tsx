"use client";

// 2026-07-24 : OfficeManagementPanel — 경영 관리 사이드 패널 (Office Management 101 스타일).
// TAB 키 또는 관리 버튼으로 열림. 우측 슬라이드인, 모바일 전체화면 오버레이.

import { useState } from "react";
import {
  hasActiveWork,
  npcStatusLabel,
  type Npc,
  type GameClock,
  deptColor,
  deptLabel,
} from "@ldd/core";
import { formatClockTime } from "@ldd/core";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  npcs: Npc[];
  // 직원을 고르면 상세를 연다. 없으면 목록은 읽기 전용으로 남는다(선택 필드인 이유).
  onSelectNpc?: (npc: Npc) => void;
  clock: GameClock;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------
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
export function OfficeManagementPanel({ npcs, clock, onClose, onSelectNpc }: Props) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

  // 부서별 그룹핑
  const byDept = new Map<string, Npc[]>();
  for (const npc of npcs) {
    const list = byDept.get(npc.department) ?? [];
    list.push(npc);
    byDept.set(npc.department, list);
  }

  // 2026-07-26 (피드백 5-5·5-7): 생산성 평균·MVP·최고 생산성 부서·평판 별점 계산을 걷어냈다.
  // 전부 시뮬레이터가 흔들던 값이라 화면에 띄워도 아무것도 알 수 없었다.
  // 아래 셋은 **실제로 배분된 업무**만 센다.
  const activeTaskCount = npcs.reduce(
    (sum, n) => sum + n.tasks.filter((t) => t.status === "active").length,
    0,
  );
  const workingCount = npcs.filter((n) => hasActiveWork(n)).length;
  const idleCount = npcs.filter(
    (n) => n.schedulePhase === "working" && !hasActiveWork(n),
  ).length;

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="경영 관리 패널"
        tabIndex={-1}
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

          {/* 2026-07-26 (피드백 5-5): 자금·수익·지출·평판을 걷어냈다.
              "자금 수익 이런 게임성요소들은 필요없고" — 이 숫자들은 어떤 실제 데이터와도
              연결돼 있지 않아 보고 있어도 알 수 있는 게 없었다. 시계와 인원수만 남긴다. */}
          <div className="flex items-center justify-end mt-1">
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
              // 2026-07-26 (피드백 5-7): 부서 "생산성 %"는 NPC 생성 시 난수(60~89)로 박힌 뒤
              // 아무것도 바꾸지 않는 값이었다 — 매번 다르게 보이지만 아무 뜻도 없었다.
              // 실제로 배분된 업무를 맡은 직원 비율로 바꾼다(막대도 같은 값을 쓴다).
              const busy = members.filter((n) => hasActiveWork(n)).length;
              const busyPct = Math.round((busy / members.length) * 100);
              const color = deptColor(dept);
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
                      {deptLabel(dept)}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {busy}/{members.length}
                    </span>
                    <span className="font-mono text-xs w-8 text-right" style={{ color }}>
                      {busyPct}%
                    </span>
                  </button>

                  {/* 업무를 맡은 직원 비율 */}
                  <div className="px-2 pb-1.5">
                    <ProgressBar value={busyPct} color={color} />
                  </div>

                  {/* 직원 목록 (확장) */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 bg-gray-800/50">
                      <div className="px-2 py-1 flex font-mono text-[10px] text-gray-500 border-b border-gray-700">
                        <span className="flex-1">이름</span>
                        <span className="w-20 text-right">상태</span>
                        <span className="w-12 text-right">업무</span>
                      </div>
                      {members.map((npc) => (
                        // 2026-07-27 : 오피스 - 목록에서 상세 열기 (2차 피드백 5-2·5-5, Phase 48 T4)
                        // 전에는 상세를 보려면 **지도에서 그 직원을 찾아 클릭**해야 했다.
                        // 20명이 돌아다니는 화면에서 특정 직원을 찾는 건 그 자체가 일이다.
                        // 여기서 바로 열 수 있게 한다 — 새 데이터도, 새 화면도 만들지 않는다.
                        // button으로 두어 키보드 Tab·Enter로도 열린다(캔버스는 접근성이 잘 빠진다).
                        <button
                          type="button"
                          key={npc.id}
                          onClick={() => onSelectNpc?.(npc)}
                          aria-label={`${npc.name} 상세 보기`}
                          className="w-full px-2 py-0.5 flex font-mono text-[10px] text-gray-300
                                     hover:bg-gray-700/50 focus-visible:bg-gray-700/50 transition-colors"
                        >
                          {/* 2026-07-26 (피드백 5-5): 급여·만족도 제거. 급여는 게임 재화이고
                              만족도는 난수로 흔들리던 값이라 둘 다 근거가 없었다.
                              대신 **맡은 실제 업무 건수**를 보여준다 — 이건 실제 데이터다. */}
                          <span className="flex-1 truncate">{npc.name}</span>
                          <span className="w-20 text-right text-gray-400">
                            {npcStatusLabel(npc.schedulePhase, hasActiveWork(npc))}
                          </span>
                          <span className="w-12 text-right text-gray-400">
                            {npc.tasks.filter((t) => t.status === "active").length}건
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 섹션: 지금 상황 ──
            2026-07-26 (피드백 5-5·5-7): 원래 "오늘의 성과"였고 완료 작업·전사 생산성·최고 생산성·
            MVP를 보여줬다. 그 값들은 전부 시뮬레이터가 난수로 만든 것이라, 가짜 업무 생성을
            없앤 지금은 항상 0이거나 고정값이 된다. 남겨두면 "0건"이 사실인 것처럼 보인다.
            대신 실제 워크스페이스에서 배분된 업무만 센다 — 전부 확인 가능한 숫자다. */}
        <div className="px-3 pt-4 pb-4">
          <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            지금 상황
          </h3>

          <div className="border border-gray-700 rounded px-3 py-2.5 space-y-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-gray-400">진행 중인 업무</span>
              <span className="text-white font-bold">{activeTaskCount}건</span>
            </div>

            <div className="flex justify-between font-mono text-xs">
              <span className="text-gray-400">일하는 직원</span>
              <span className="text-white">
                {workingCount}명 / {npcs.length}명
              </span>
            </div>

            {idleCount > 0 && (
              <div className="flex justify-between font-mono text-xs">
                <span className="text-gray-400">쉬는 중</span>
                <span className="text-gray-300">{idleCount}명</span>
              </div>
            )}

            {activeTaskCount === 0 && (
              <p className="pt-1 font-mono text-[10px] leading-relaxed text-gray-500">
                할 일·페이지·습관·일정이 없어서 직원들이 맡을 업무가 없어요.
                업무를 만들면 여기 직원들에게 배분됩니다.
              </p>
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
