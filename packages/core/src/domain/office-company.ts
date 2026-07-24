// 2026-07-24 : office-company — 회사 재정 + 직원 통계 (순수 함수, 사이드이펙트 없음).

export type CompanyStats = {
  money: number;           // 회사 자금 (원)
  revenue: number;         // 게임 시간당 수익
  expenses: number;        // 게임 시간당 지출 (급여 합산)
  reputation: number;      // 0-100 평판
  totalTasksCompleted: number;
};

export type EmployeeStats = {
  productivity: number; // 0-100
  satisfaction: number; // 0-100
  salary: number;
  hireDate: number;     // game totalMinutes 기준
  tasksCompleted: number;
};

// 회사 초기 상태
export function createCompany(): CompanyStats {
  return {
    money: 100_000,
    revenue: 500,
    expenses: 350,
    reputation: 50,
    totalTasksCompleted: 0,
  };
}

// 게임 시간 1시간마다 호출. npcsCount: 현재 재직 중인 직원 수.
export function tickCompany(stats: CompanyStats, npcsCount: number): CompanyStats {
  const expenses = npcsCount * 10; // 직원 1인당 시간당 10원
  return {
    ...stats,
    money: stats.money + stats.revenue - expenses,
    expenses,
  };
}

// 태스크 완료 시 호출. 회사 실적 + 평판 누적.
export function recordTaskCompletion(stats: CompanyStats): CompanyStats {
  const totalTasksCompleted = stats.totalTasksCompleted + 1;
  // 완료 10건마다 평판 1 상승, 최대 100
  const reputation = Math.min(100, stats.reputation + (totalTasksCompleted % 10 === 0 ? 1 : 0));
  return { ...stats, totalTasksCompleted, reputation };
}

// 금액 포맷 — 디스플레이 전용
export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(Math.round(amount));
}

// 평판 별 표시 (0-5개)
export function reputationStars(reputation: number): number {
  return Math.round((reputation / 100) * 5);
}
