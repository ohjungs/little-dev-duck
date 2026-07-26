// 2026-07-26 : 통계 - 로그집계 (피드백 3-1·3-2)
// "방문자가 자주 방문하는 페이지, 평균 방문횟수, 방문 시간 등을 로그로 남겨서 볼수있도록 해",
// "에러로그, 배치로그, 작업한 로그, 행동 로그 등을 볼수있는 통계가 있어야지".
//
// **새 테이블을 만들지 않았다.** `action_log`가 이미 있고(user_id·tool_name·args_summary·
// status·result_summary·created_at) 필요한 모양을 전부 담는다. 종류별로 테이블을 나누면
// 조회가 네 번으로 늘고 RLS 정책도 네 벌이 된다 — 그리고 DDL은 실행 전 확인이 필요해
// 적용까지 시간이 걸린다. 이름 규칙으로 나누면 지금 있는 것으로 오늘부터 쌓인다.
//
// 이름 규칙: `<종류>:<이름>` — 접두사가 없으면 오리 도구 실행(기존 기록)이다.
//   page:view          방문 로그   (어느 페이지를 언제 열었나)
//   batch:news-collect 배치 로그   (수집·재색인 같은 자동 작업)
//   app:<동작>         행동 로그   (사용자가 화면에서 한 일)
//   (접두사 없음)       작업 로그   (오리가 실행한 도구)
// 에러 로그는 종류가 아니라 **상태**다(status='error') — 어느 종류에서도 날 수 있으므로
// 별도 종류로 두면 같은 사건이 두 곳에 나뉜다.

export type LogKind = "visit" | "batch" | "app" | "tool";

export interface LogEntryLike {
  toolName: string;
  status: "success" | "error";
  argsSummary?: string | null;
  resultSummary?: string | null;
  createdAt: string;
}

const PREFIX_TO_KIND: Record<string, LogKind> = {
  page: "visit",
  batch: "batch",
  app: "app",
};

// 로그 한 건의 종류. 접두사가 규칙에 없으면 도구 실행으로 본다(기존 기록이 그렇다).
export function logKind(toolName: string): LogKind {
  const idx = toolName.indexOf(":");
  if (idx <= 0) return "tool";
  return PREFIX_TO_KIND[toolName.slice(0, idx)] ?? "tool";
}

// 접두사를 뗀 표시용 이름. 접두사가 없으면 그대로.
export function logName(toolName: string): string {
  const idx = toolName.indexOf(":");
  return idx > 0 && PREFIX_TO_KIND[toolName.slice(0, idx)]
    ? toolName.slice(idx + 1)
    : toolName;
}

export const LOG_KIND_LABELS: Record<LogKind, string> = {
  visit: "방문",
  batch: "배치",
  app: "행동",
  tool: "오리 작업",
};

// ---------------------------------------------------------------------------
// 집계
// ---------------------------------------------------------------------------

export interface LogCount {
  name: string;
  count: number;
}

export interface LogStats {
  total: number;
  errors: number;
  // 0~100. 건수가 0이면 0(0/0을 NaN으로 두면 화면에 NaN%가 뜬다).
  errorRate: number;
  byKind: Record<LogKind, number>;
  // 종류 안에서 많이 나온 순. 동점이면 이름순으로 확정해 새로고침마다 순서가 흔들리지 않게 한다.
  topNames: LogCount[];
  // 최근 실패만 따로. 문제를 볼 때 성공 사이에서 찾아내지 않아도 되게.
  recentErrors: LogEntryLike[];
}

function rank(counts: Map<string, number>, limit: number): LogCount[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name)))
    .slice(0, limit);
}

export function summarizeLogs(
  entries: readonly LogEntryLike[],
  options: { kind?: LogKind; topLimit?: number; errorLimit?: number } = {},
): LogStats {
  const topLimit = options.topLimit ?? 5;
  const errorLimit = options.errorLimit ?? 5;

  const byKind: Record<LogKind, number> = { visit: 0, batch: 0, app: 0, tool: 0 };
  const counts = new Map<string, number>();
  const errors: LogEntryLike[] = [];
  let total = 0;
  let errorCount = 0;

  for (const e of entries) {
    const kind = logKind(e.toolName);
    byKind[kind] += 1;
    if (options.kind && kind !== options.kind) continue;
    total += 1;
    const name = logName(e.toolName);
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (e.status === "error") {
      errorCount += 1;
      errors.push(e);
    }
  }

  return {
    total,
    errors: errorCount,
    errorRate: total === 0 ? 0 : Math.round((errorCount / total) * 100),
    byKind,
    topNames: rank(counts, topLimit),
    // 최근 순으로 자른다. 입력이 어떤 순서든 결과가 같도록 여기서 다시 정렬한다.
    recentErrors: [...errors]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, errorLimit),
  };
}

// ---------------------------------------------------------------------------
// 방문 통계 (3-1)
// ---------------------------------------------------------------------------

export interface VisitStats {
  // 방문 기록이 있는 페이지 수
  pages: number;
  totalVisits: number;
  // 페이지 하나당 평균 방문 횟수. 소수 한 자리.
  avgVisitsPerPage: number;
  topPages: LogCount[];
  // 시간대별 방문 수(0~23시). 길이 24 고정 — 빈 시간대도 0으로 채워 그래프가 끊기지 않게.
  byHour: number[];
}

// 방문 로그를 집계한다. 시각은 **호출부가 준 지역 시(hour)** 를 쓴다 —
// 여기서 Date를 만들어 시각을 뽑으면 서버(UTC)와 화면(KST)이 다른 답을 낸다.
// 이 저장소가 날짜 시간대 문제로 여러 번 깨졌던 부류라 계산에서 아예 뺀다.
export function summarizeVisits(
  entries: readonly (LogEntryLike & { hour: number })[],
  options: { topLimit?: number } = {},
): VisitStats {
  const topLimit = options.topLimit ?? 5;
  const counts = new Map<string, number>();
  const byHour = new Array<number>(24).fill(0);
  let totalVisits = 0;

  for (const e of entries) {
    if (logKind(e.toolName) !== "visit") continue;
    totalVisits += 1;
    // 페이지 이름은 args_summary에 넣는다(제목). 없으면 이름으로 대체.
    const label = (e.argsSummary ?? "").trim() || logName(e.toolName);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    if (Number.isInteger(e.hour) && e.hour >= 0 && e.hour < 24) byHour[e.hour] += 1;
  }

  const pages = counts.size;
  return {
    pages,
    totalVisits,
    avgVisitsPerPage: pages === 0 ? 0 : Math.round((totalVisits / pages) * 10) / 10,
    topPages: rank(counts, topLimit),
    byHour,
  };
}
