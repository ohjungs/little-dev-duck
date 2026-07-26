import type { DuckMood } from "./duck-mood";

// 2026-07-26 : 오리 - 자율 발화 - 말 걸 거리 고르기 (피드백 1-3)
// "오리가 자율적으로 말을걸고 물어보고시키기 + 이미지랑 통합해서 자연스럽게 대화".
//
// **LLM을 쓰지 않는다.** "오늘 마감 3건", "저녁인데 안 한 습관 2개", "20분 뒤 회의" 같은 조건은
// 전부 결정적이다. 모델에 맡기면 ① 무료 Gemini 쿼터가 잡담에 소모되고(Phase 19에서 겪은 부류)
// ② 같은 상황에서 매번 다른 말이 나와 신뢰가 떨어진다. 판단은 규칙, 문장은 템플릿으로 고정한다.
//
// 순수함수다. "지금 몇 시인지·무엇이 밀렸는지"는 호출부가 재서 넘긴다 — 그래야 시간대와 무관하게
// 테스트할 수 있다(이 저장소가 날짜 버그로 여러 번 데인 부분).

export type InitiativeKind = "overdue" | "dueToday" | "upcomingEvent" | "habit";

export type InitiativeCandidate = {
  kind: InitiativeKind;
  /** 낮을수록 급하다. 정렬 기준. */
  priority: number;
  message: string;
  /** 말풍선과 오리 표정을 맞춘다 — 재촉하면서 웃고 있으면 어긋난다. */
  mood: DuckMood;
};

export type InitiativeInput = {
  /** 로컬 시(0~23). 호출부가 잰다. */
  hour: number;
  overdueTodos: number;
  dueTodayTodos: number;
  /** 오늘 아직 체크하지 않은 습관 제목. */
  uncheckedHabits: string[];
  /** 다음 일정까지 남은 분. 없으면 null, 음수면 이미 지났다. */
  nextEventInMinutes: number | null;
  nextEventTitle: string | null;
};

export type InitiativeState = {
  /** 오늘 이미 말한 종류. 같은 상황을 반복하면 잔소리가 된다. */
  spokenKinds: InitiativeKind[];
  /** 오늘 자율 발화 총 횟수. */
  spokenCount: number;
  /** 방해금지 시간대인지. 판정은 호출부(설정을 읽는 쪽)가 한다. */
  quiet: boolean;
};

/** 하루 자율 발화 총량. 종류별로 한 번씩이라도 이 수를 넘지 않는다. */
export const INITIATIVE_DAILY_CAP = 4;

/** 이 시각(로컬)부터 "하루가 저문다"고 보고 습관을 재촉한다. */
const HABIT_NUDGE_HOUR = 18;

/** 일정은 이 시간 안쪽일 때만 알린다. 반나절 뒤 일정을 지금 알리면 소음이다. */
const EVENT_SOON_MINUTES = 90;

const count = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function buildInitiatives(input: InitiativeInput): InitiativeCandidate[] {
  const out: InitiativeCandidate[] = [];

  const overdue = count(input.overdueTodos);
  if (overdue > 0) {
    out.push({
      kind: "overdue",
      priority: 1,
      message: `기한이 지난 할 일이 ${overdue}개 있어요. 같이 정리해볼까요?`,
      mood: "sad",
    });
  }

  const minutes = input.nextEventInMinutes;
  const title = (input.nextEventTitle ?? "").trim();
  // 음수(이미 지남)·NaN·너무 먼 일정은 제외. 제목이 비면 무슨 일정인지 못 알려주므로 건너뛴다.
  if (
    typeof minutes === "number" &&
    Number.isFinite(minutes) &&
    minutes >= 0 &&
    minutes <= EVENT_SOON_MINUTES &&
    title.length > 0
  ) {
    out.push({
      kind: "upcomingEvent",
      priority: 2,
      message: `${Math.round(minutes)}분 뒤에 "${title}" 일정이 있어요.`,
      mood: "neutral",
    });
  }

  const dueToday = count(input.dueTodayTodos);
  if (dueToday > 0) {
    out.push({
      kind: "dueToday",
      priority: 3,
      message: `오늘 마감인 할 일이 ${dueToday}개예요. 하나씩 해치워요!`,
      mood: "neutral",
    });
  }

  // 아침 9시에 "오늘 운동 안 했다"고 하면 틀린 말은 아니지만 무례하다.
  const habits = input.uncheckedHabits.map((h) => h.trim()).filter((h) => h.length > 0);
  if (input.hour >= HABIT_NUDGE_HOUR && habits.length > 0) {
    out.push({
      kind: "habit",
      priority: 4,
      message:
        habits.length === 1
          ? `오늘 "${habits[0]}" 아직 안 했어요. 지금 어때요?`
          : `오늘 아직 안 한 습관이 ${habits.length}개 남았어요.`,
      mood: "neutral",
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/**
 * 지금 말을 걸지, 건다면 무엇을 말할지 정한다. 말할 게 없으면 null.
 * 상한·방해금지·중복은 전부 여기서 걸러 호출부가 판단을 다시 하지 않게 한다.
 */
export function pickInitiative(
  input: InitiativeInput,
  state: InitiativeState,
): InitiativeCandidate | null {
  if (state.quiet) return null;
  if (state.spokenCount >= INITIATIVE_DAILY_CAP) return null;
  const spoken = new Set(state.spokenKinds);
  return buildInitiatives(input).find((c) => !spoken.has(c.kind)) ?? null;
}
