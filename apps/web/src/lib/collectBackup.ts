import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listTodos,
  listMemos,
  listHabits,
  listHabitChecks,
  listCalendarEvents,
  listPagesForExport,
  listFeeds,
  getDuckState,
  listPomodoroSessions,
  listActivityDaily,
  ACTIVITY_EXPORT_LIMIT,
  HABIT_CHECK_EXPORT_LIMIT,
  PAGE_EXPORT_LIMIT,
} from "@ldd/api";
import { buildBackup, type Backup, type BackupCollectionKey } from "@ldd/core";

// 2026-07-26 : 백업 - 내보내기 - 조합지점
// 조립은 순수함수(core buildBackup)로, 조회는 api로 각각 테스트돼 있었는데 **정작 둘을 잇는
// 지점**이 틀려 있었다 — 내보내기가 본문 없는 목록용 조회(listPages)를 쓰고, 캘린더 일정과
// 습관 체크 기록은 아예 부르지 않았다. 이 저장소가 반복해서 겪은 부류라 조합을 따로 잠근다.
// 컴포넌트에 두면 node 환경 테스트에서 검사할 수 없어 lib으로 분리한다.

// 각 조회가 건 상한. 돌아온 개수가 이 값과 같으면 뒤가 잘렸을 수 있다.
const QUERY_CAPS: Partial<Record<BackupCollectionKey, number>> = {
  todos: 500,
  memos: 500,
  habits: 500,
  calendarEvents: 500,
  pages: PAGE_EXPORT_LIMIT,
  habitChecks: HABIT_CHECK_EXPORT_LIMIT,
  pomodoroSessions: 500,
  activityDaily: ACTIVITY_EXPORT_LIMIT,
};

export const BACKUP_LABELS: Record<BackupCollectionKey, string> = {
  todos: "할 일",
  memos: "메모",
  habits: "습관",
  habitChecks: "습관 체크 기록",
  calendarEvents: "캘린더 일정",
  pages: "페이지",
  feeds: "뉴스 피드",
  duckState: "오리 상태",
  pomodoroSessions: "집중 기록",
  activityDaily: "활동 기록",
};

export async function collectBackup(supabase: SupabaseClient): Promise<Backup> {
  const [
    todos,
    memos,
    habits,
    habitChecks,
    calendarEvents,
    pages,
    feeds,
    duckState,
    pomodoroSessions,
    activityDaily,
  ] = await Promise.all([
      listTodos(supabase),
      listMemos(supabase),
      listHabits(supabase),
      listHabitChecks(supabase, HABIT_CHECK_EXPORT_LIMIT),
      listCalendarEvents(supabase),
      // 목록용 listPages는 content를 빼므로 백업에 쓰면 제목만 남는다.
      listPagesForExport(supabase),
      listFeeds(supabase),
      // 행이 하나뿐이라 배열로 감싼다. getDuckState는 행이 없으면 기본값 행을 만드는데,
      // 앱을 열면 어차피 만들어지는 행이라 내보내기가 그걸 앞당기는 것뿐이다.
      getDuckState(supabase).then((s) => [s]),
      listPomodoroSessions(supabase),
      listActivityDaily(supabase),
    ]);

  return buildBackup(
    {
      todos,
      memos,
      habits,
      habitChecks,
      calendarEvents,
      pages,
      feeds,
      duckState,
      pomodoroSessions,
      activityDaily,
    },
    new Date().toISOString(),
    QUERY_CAPS,
  );
}
