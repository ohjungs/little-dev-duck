// Phase E — NPC 프로필 + 행동 시뮬레이션(순수 함수, 사이드이펙트 없음).
// 게임 클럭: 1 실제 초 = 1 게임 분 (24 게임 시간 = 24 실제 분).

import type { DepartmentId } from "./office-department";
import type { DuckWorkState } from "./office-event";
import type { Vec } from "./office-tilemap";

export type NpcTask = {
  id: string;
  title: string;
  status: "active" | "done" | "waiting";
  progress: number; // 0-100
};

export type NpcSchedulePhase =
  | "commuting"
  | "working"
  | "lunch"
  | "break"
  | "leaving"
  | "offwork";

export type Npc = {
  id: string;
  name: string;
  department: DepartmentId;
  role: string;
  accessory: string;
  accessoryColor: string;
  tile: Vec; // 현재 그리드 위치
  deskTile: Vec; // 배정된 책상
  facing: "up" | "down" | "left" | "right";
  workState: DuckWorkState;
  schedulePhase: NpcSchedulePhase;
  tasks: NpcTask[];
  recentDone: NpcTask[];
  mood: "happy" | "neutral" | "stressed" | "tired";
};

export type GameClock = {
  hour: number;    // 0-23
  minute: number;  // 0-59
  totalMinutes: number; // 시작 이후 누적 분(소수 허용)
};

export function createGameClock(startHour: number = 8): GameClock {
  return { hour: startHour, minute: 0, totalMinutes: startHour * 60 };
}

export function tickClock(clock: GameClock, deltaMs: number): GameClock {
  // 1실초 = 1게임분: deltaMs / 1000 = 추가 게임 분
  const addedMinutes = deltaMs / 1000;
  const total = clock.totalMinutes + addedMinutes;
  // 하루(1440분) 래핑: 항상 0-1439 범위의 dayMinutes
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  return {
    hour: Math.floor(dayMinutes / 60),
    minute: Math.floor(dayMinutes % 60),
    totalMinutes: total,
  };
}

export function formatClockTime(clock: GameClock): string {
  return `${String(clock.hour).padStart(2, "0")}:${String(Math.floor(clock.minute)).padStart(2, "0")}`;
}

// 게임 시각(hour) -> 스케줄 단계
export function schedulePhase(hour: number): NpcSchedulePhase {
  if (hour < 8) return "offwork";
  if (hour < 9) return "commuting";
  if (hour < 12) return "working";
  if (hour < 13) return "lunch";
  if (hour < 18) return "working";
  if (hour < 19) return "leaving";
  return "offwork";
}

// 스케줄 단계 -> 렌더링에 쓸 DuckWorkState
export function phaseToWorkState(phase: NpcSchedulePhase): DuckWorkState {
  switch (phase) {
    case "working":   return "typing";
    case "lunch":     return "question"; // 식사 중
    case "break":     return "question";
    case "commuting": return "offwork";
    case "leaving":   return "offwork";
    case "offwork":   return "offwork";
  }
}

// 태스크 시뮬레이션: 게임 1분 단위로 호출. working 상태가 아니면 그대로 반환.
export function simulateNpcTasks(npc: Npc, clock: GameClock, rng: () => number): Npc {
  if (npc.schedulePhase !== "working") return npc;

  const tasks = npc.tasks.map((t) => {
    if (t.status !== "active") return t;
    // 분당 0.5-2% 진행
    const advance = 0.5 + rng() * 1.5;
    const newProgress = Math.min(100, t.progress + advance);
    if (newProgress >= 100) {
      return { ...t, progress: 100, status: "done" as const };
    }
    return { ...t, progress: newProgress };
  });

  // 완료된 태스크를 recentDone으로 이동(최대 3개 유지)
  const done = tasks.filter((t) => t.status === "done");
  const active = tasks.filter((t) => t.status !== "done");
  const recentDone = [...done, ...npc.recentDone].slice(0, 3);

  // 활성 태스크가 2개 미만이면 10% 확률로 새 태스크 생성
  if (active.length < 2 && rng() < 0.1) {
    const templates = getTaskTemplates(npc.department);
    const template = templates[Math.floor(rng() * templates.length)];
    active.push({
      id: `task-${clock.totalMinutes}-${rng().toString(36).slice(2, 6)}`,
      title: template,
      status: "active",
      progress: 0,
    });
  }

  return { ...npc, tasks: active, recentDone };
}

// 부서별 태스크 템플릿(결정적 데이터 — LLM 없이 매핑)
export function getTaskTemplates(dept: DepartmentId): string[] {
  const templates: Record<DepartmentId, string[]> = {
    engineering: [
      "API 리팩터링", "버그 수정 #142", "코드 리뷰", "DB 마이그레이션",
      "CI/CD 파이프라인", "단위 테스트 작성", "기능 개발", "성능 최적화",
    ],
    marketing: [
      "SNS 콘텐츠 기획", "광고 성과 분석", "브랜드 가이드 업데이트",
      "이메일 캠페인", "시장 조사 보고서", "블로그 포스트 작성",
    ],
    design: [
      "UI 목업 작업", "디자인 시스템 업데이트", "아이콘 세트 제작",
      "사용성 테스트", "와이어프레임 설계", "프로토타입 제작",
    ],
    hr: [
      "채용 면접 진행", "온보딩 자료 준비", "성과 평가 정리",
      "복리후생 검토", "교육 프로그램 기획",
    ],
    finance: [
      "월간 결산", "예산 보고서 작성", "세금 신고 준비",
      "비용 분석", "재무제표 검토",
    ],
    sales: [
      "거래처 미팅 준비", "제안서 작성", "계약서 검토",
      "영업 실적 보고", "신규 고객 발굴",
    ],
    support: [
      "고객 문의 응대", "FAQ 업데이트", "버그 리포트 정리",
      "사용자 가이드 작성", "VOC 분석",
    ],
    qa: [
      "테스트 케이스 작성", "회귀 테스트 실행", "버그 재현 및 보고",
      "자동화 스크립트 작성", "릴리스 검증",
    ],
    operations: [
      "서버 모니터링", "보안 패치 적용", "백업 검증",
      "인프라 비용 최적화", "장애 대응 매뉴얼 갱신",
    ],
  };
  return templates[dept];
}
