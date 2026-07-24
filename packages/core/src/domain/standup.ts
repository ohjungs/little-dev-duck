import { z } from "zod";

export const standupInputSchema = z.object({
  todosCompleted: z.number(),
  todosTotal: z.number(),
  habitsChecked: z.number(),
  habitsTotal: z.number(),
  pomodoroMinutes: z.number(),
  pomodoroSessions: z.number(),
  calendarEvents: z.array(z.string()),
  pagesEdited: z.number(),
});
export type StandupInput = z.infer<typeof standupInputSchema>;

export function formatStandupPrompt(input: StandupInput, today: string): string {
  const lines: string[] = [
    `오늘은 ${today}이야. 나는 "Little Dev Duck"이라는 아기 오리 AI 비서야.`,
    "아래 사용자의 24시간 활동 데이터를 보고 한국어로 스탠드업 노트를 작성해줘.",
    "형식: ## 어제 한 일 / ## 오늘 할 일 / ## 막힌 것 (각 섹션 2~4줄 불릿)",
    "오리 페르소나로 친근하게 쓰되 과하지 않게. 데이터가 없는 섹션은 '기록 없음'으로.",
    "",
    "--- 활동 데이터 ---",
    `할 일: ${input.todosCompleted}/${input.todosTotal} 완료`,
    `습관: ${input.habitsChecked}/${input.habitsTotal} 체크`,
    `뽀모도로: ${input.pomodoroSessions}회, 총 ${input.pomodoroMinutes}분 집중`,
    `캘린더: ${input.calendarEvents.length > 0 ? input.calendarEvents.join(", ") : "일정 없음"}`,
    `페이지 편집: ${input.pagesEdited}건`,
  ];
  return lines.join("\n");
}

export function hasActivity(input: StandupInput): boolean {
  return (
    input.todosTotal > 0 ||
    input.habitsTotal > 0 ||
    input.pomodoroSessions > 0 ||
    input.calendarEvents.length > 0 ||
    input.pagesEdited > 0
  );
}
