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
  listRooms,
  fetchAllRoomMessages,
  ACTIVITY_EXPORT_LIMIT,
  HABIT_CHECK_EXPORT_LIMIT,
  PAGE_EXPORT_LIMIT,
  ROOM_LIST_LIMIT,
} from "@ldd/api";
import { buildBackup, type Backup, type BackupCollectionKey } from "@ldd/core";
import { readLocalPrefs } from "./localPrefs";

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
  messageRooms: ROOM_LIST_LIMIT,
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
  messageRooms: "대화방",
  messages: "메시지",
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

  // v5: 메신저 대화 — 다시 만들 방법이 없는 유일본이다. 대화 내보내기(.txt)와 같은
  // 수집 경로(fetchAllRoomMessages)로 방마다 처음까지 전부 읽는다. 방별로 순차 실행 —
  // 방 수 × 왕복을 한꺼번에 쏘면 요청이 몰린다(백업은 급하지 않다).
  const messageRooms = await listRooms(supabase);
  const messages: unknown[] = [];
  let messagesHitGuard = false;
  for (const room of messageRooms) {
    const r = await fetchAllRoomMessages(supabase, room.id);
    messages.push(...r.messages);
    if (r.hitGuard) messagesHitGuard = true;
  }

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
      messageRooms,
      messages,
    },
    new Date().toISOString(),
    QUERY_CAPS,
    // 브라우저에만 있던 값(할 일 순서·즐겨찾기·방해금지 등). DB 조회가 아니라 상한 판정 대상이
    // 아니고, 서버·테스트 환경에는 window가 없어 빈 객체가 된다.
    readLocalPrefs(),
    // 메시지는 방별 왕복 가드라 개수-상한 비교로는 잘림을 알 수 없다 — 가드에 닿은
    // 사실 자체를 전달한다(한 방이라도 닿았으면 파일 어딘가가 짧다).
    messagesHitGuard ? ["messages"] : [],
  );
}
