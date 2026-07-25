import { Building2 } from "lucide-react";
import { PixelOffice } from "@/components/PixelOffice";
import { createClient } from "@/lib/supabase/server";
import {
  listTodos,
  listPages,
  listHabits,
  listPomodoroSessions,
  listCalendarEvents,
} from "@ldd/api";
import { mapWorkspaceToOfficeTasks } from "@ldd/core";

export const dynamic = "force-dynamic";

// Phase 16: 픽셀 오리 오피스 — 실제 Supabase 데이터를 서버에서 패치해 NPC에 배분한다.
// 데이터→NPC 태스크 매핑(순수·결정적)은 core `mapWorkspaceToOfficeTasks`로 추출·테스트됨.

export default async function OfficePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  // 실제 데이터 병렬 패치 — 어느 하나가 실패해도 나머지는 계속 사용한다 (에러 내성)
  const [todosResult, pagesResult, habitsResult, pomodorosResult, eventsResult] =
    await Promise.allSettled([
      listTodos(supabase),
      listPages(supabase),
      listHabits(supabase),
      listPomodoroSessions(supabase),
      listCalendarEvents(supabase),
    ]);

  const todos = todosResult.status === "fulfilled" ? todosResult.value : [];
  const pages = pagesResult.status === "fulfilled" ? pagesResult.value : [];
  const habits = habitsResult.status === "fulfilled" ? habitsResult.value : [];
  const pomodoros = pomodorosResult.status === "fulfilled" ? pomodorosResult.value : [];
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];

  // OfficeTask 직렬화 가능한 순수 객체 배열 (함수·Date 없음)
  const realTasks = mapWorkspaceToOfficeTasks(todos, pages, habits, pomodoros, events);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="size-6 text-primary-accent" />
          픽셀 오피스
        </h1>
        <p className="text-sm text-muted-foreground">
          직원 오리들이 각자 책상에서 일해요. 도구 실행에 따라 상태(타이핑·읽기·빌드·에러)가 바뀌고,
          한동안 조용하면 퇴근합니다. 캔버스를 클릭해 포커스한 뒤 방향키/WASD로 대장오리(👑)를 움직여
          직원 오리 옆에서 E를 누르면 지금 뭐 하는지 물어봐요.
        </p>
      </div>
      <PixelOffice realTasks={realTasks} />
    </div>
  );
}
