import type { SupabaseClient } from "@supabase/supabase-js";
import {
  restoreTodo,
  restoreMemo,
  restoreHabit,
  restoreHabitCheck,
  restoreCalendarEvent,
  restorePageFromBackup,
  restoreFeed,
  restoreDuckState,
  restorePomodoroSession,
  restoreActivityDaily,
} from "@ldd/api";
import { parseBackup, planRestore, type Backup } from "@ldd/core";
import { restoreLocalPrefs } from "./localPrefs";

// 2026-07-26 : 백업 - 가져오기 - 실행
// 판단(무엇을 어떤 순서로)은 core가, 쓰기는 api가 한다. 여기는 둘을 잇는 자리다 —
// 내보내기에서 결함이 났던 바로 그 자리라 이번에도 테스트로 잠근다.
//
// **덮어쓰지 않는다.** 모든 복원은 "같은 id로 insert, 이미 있으면 건너뜀"이라
// 기존 데이터를 지우거나 바꾸지 않는다. 백업을 두 번 넣어도 결과가 같다(멱등).

export type RestoreOutcome = {
  restored: number;
  // 모양이 깨져 넣지 못한 항목 수(파일 쪽 문제).
  invalid: number;
  // 넣다가 실패한 항목 수(DB 쪽 거절 — 예: 파일에도 DB에도 없는 부모를 가리키는 페이지).
  failed: number;
  // 처음 몇 건의 실패 사유. 전부 모으면 화면이 길어지고, 없으면 원인을 알 수 없다.
  errors: string[];
  // 브라우저에 복원한 설정 수(할 일 순서·즐겨찾기 등). DB 항목과 세는 대상이 달라 따로 둔다 —
  // restored에 섞으면 미리보기에서 보여준 개수와 맞지 않아 사용자가 무엇이 들어갔는지 알 수 없다.
  localPrefs: number;
};

const MAX_REPORTED_ERRORS = 5;

// 파일 내용(JSON.parse 결과)을 검사만 한다. 쓰기 전에 "무엇이 들어갈지" 보여주기 위함.
export function previewBackup(raw: unknown):
  | { ok: true; backup: Backup; total: number; invalid: number }
  | { ok: false; reason: string } {
  const parsed = parseBackup(raw);
  if (!parsed.ok) return parsed;
  const plan = planRestore(parsed.backup);
  return { ok: true, backup: parsed.backup, total: plan.total, invalid: plan.invalid };
}

export async function restoreBackup(
  supabase: SupabaseClient,
  backup: Backup,
): Promise<RestoreOutcome> {
  const plan = planRestore(backup);
  const outcome: RestoreOutcome = {
    restored: 0,
    invalid: plan.invalid,
    failed: 0,
    errors: [],
    // 브라우저 설정은 네트워크를 타지 않아 실패할 일이 사실상 없다. DB 쓰기가 하나라도 실패해도
    // 이건 되도록 먼저 넣는다 — 순서 의존이 없고, 뒤로 미루면 중간 실패 때 통째로 빠진다.
    localPrefs: restoreLocalPrefs(backup.localPrefs),
  };

  // 한 건이 실패해도 나머지를 계속 넣는다. 중간에 멈추면 사용자는 "얼마나 들어갔는지"
  // 모르는 상태로 남고, 다시 시도하려면 무엇이 이미 들어갔는지 알아야 한다(멱등이라 재시도는 안전).
  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      outcome.restored += 1;
    } catch (e) {
      outcome.failed += 1;
      if (outcome.errors.length < MAX_REPORTED_ERRORS) {
        outcome.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  };

  // 순서가 계약이다: 습관 → 습관 체크(외래키), 페이지는 부모 먼저(core가 정렬해 준다).
  // 순차 실행 — 병렬로 밀어 넣으면 부모보다 자식이 먼저 도착할 수 있다.
  for (const todo of plan.todos) await run("할 일", () => restoreTodo(supabase, todo));
  for (const memo of plan.memos) await run("메모", () => restoreMemo(supabase, memo));
  for (const habit of plan.habits) await run("습관", () => restoreHabit(supabase, habit));
  for (const check of plan.habitChecks) {
    await run("습관 체크", () => restoreHabitCheck(supabase, check));
  }
  for (const event of plan.calendarEvents) {
    await run("일정", () => restoreCalendarEvent(supabase, event));
  }
  for (const page of plan.pages) {
    await run("페이지", () => restorePageFromBackup(supabase, page));
  }
  for (const feed of plan.feeds) await run("뉴스 피드", () => restoreFeed(supabase, feed));
  // 오리 상태는 이미 있으면 건드리지 않는다(덮어쓰면 지금 레벨이 백업 시점으로 후퇴한다).
  for (const state of plan.duckState) {
    await run("오리 상태", () => restoreDuckState(supabase, state));
  }
  for (const s of plan.pomodoroSessions) {
    await run("집중 기록", () => restorePomodoroSession(supabase, s));
  }
  // 활동 집계도 이미 있으면 건드리지 않는다(덮어쓰면 지금 집계가 백업 시점으로 후퇴한다).
  for (const a of plan.activityDaily) {
    await run("활동 기록", () => restoreActivityDaily(supabase, a));
  }

  return outcome;
}
