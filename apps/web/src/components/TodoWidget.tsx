"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, ChevronDown, ChevronUp, ListTodo, Pencil, Plus, X } from "lucide-react";
import {
  applyXpAward,
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@ldd/api";
import type { Todo } from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { todoEmbedText } from "@/lib/embedText";
import { createClient } from "@/lib/supabase/client";
import { subscribeTable } from "@/lib/realtime";
import { emitTodosChanged } from "@/lib/todoSignal";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";
import { timeAgo } from "@/lib/timeAgo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WidgetSkeleton } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type LoadState = "loading" | "error" | "ready";

const TODO_ORDER_KEY = "ldd-todo-order";
function getTodoOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TODO_ORDER_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function saveTodoOrder(ids: string[]): void {
  localStorage.setItem(TODO_ORDER_KEY, JSON.stringify(ids));
}

export function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmCompleteAll, setConfirmCompleteAll] = useState(false);
  const [todoOrder, setTodoOrder] = useState<string[]>(() => getTodoOrder());
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const fetchTodos = async () => {
    try {
      const data = await listTodos(supabase);
      setTodos(data);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 이벤트 핸들러(reload)가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // Realtime: 다른 탭/기기에서 todos가 변경되면 목록을 다시 조회한다.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cleanup = subscribeTable(supabase, "todos", user.id, () => {
        void fetchTodos();
      });
    });
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  const reload = () => {
    setState("loading");
    fetchTodos();
  };

  // 오늘 마감인 투두의 완료 집계를 오리에게 알린다(Phase 6 T1). 목록이 바뀔 때마다 발행하므로
  // 체크/추가/삭제가 즉시 오리 기분에 반영된다. DuckWidget은 이 신호만 구독한다(중복 조회 없음).
  useEffect(() => {
    const today = todayIso();
    const todayTodos = todos.filter((t) => t.dueDate?.slice(0, 10) === today);
    emitTodosChanged({
      total: todayTodos.length,
      done: todayTodos.filter((t) => t.isDone).length,
    });
  }, [todos]);

  // Ctrl+Shift+T (Mac: Cmd+Shift+T) — 어디서든 할 일 입력창으로 포커스
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setActionError(null);
    try {
      const created = await createTodo(supabase, { title });
      setTodos((prev) => [created, ...prev]);
      // RAG 인덱싱(fire-and-forget). 실패해도 저장 흐름을 막지 않는다. 신규는 미완료 상태.
      void reindexSource({
        sourceType: "todo",
        sourceId: created.id,
        text: todoEmbedText(title, false),
      });
    } catch {
      setActionError("추가하지 못했습니다.");
    }
  };

  const handleToggle = async (todo: Todo) => {
    const willBeDone = !todo.isDone;
    const prevTodos = todos;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, isDone: willBeDone } : t)),
    );
    try {
      await updateTodo(supabase, todo.id, { isDone: willBeDone });
      // 완료/미완료 토글도 재인덱싱 — 상태를 임베딩에 반영해야 오리가 완료 여부를 답한다.
      void reindexSource({
        sourceType: "todo",
        sourceId: todo.id,
        text: todoEmbedText(todo.title, willBeDone),
      });
      if (willBeDone) {
        // 할일 완료 시 오리 XP 적립(원천: 할일 완료). 적립/신호 실패는 완료 자체를 되돌리지 않는다.
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await applyXpAward(supabase, user.id, "todoComplete");
            emitXpChanged();
          }
        } catch {
          // XP 적립 실패는 조용히 무시(완료 상태는 유지)
        }
      }
    } catch {
      setTodos(prevTodos);
      setActionError("변경하지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevTodos = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTodo(supabase, id);
      void reindexSource({ sourceType: "todo", sourceId: id, text: "" });
    } catch {
      setTodos(prevTodos);
      setActionError("삭제하지 못했습니다.");
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  const saveEdit = async (id: string) => {
    const title = editTitle.trim();
    if (!title) return;
    const prevTodos = todos;
    const isDone = prevTodos.find((t) => t.id === id)?.isDone ?? false;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    try {
      await updateTodo(supabase, id, { title });
      setEditingId(null);
      void reindexSource({
        sourceType: "todo",
        sourceId: id,
        text: todoEmbedText(title, isDone),
      });
    } catch {
      setTodos(prevTodos);
      setActionError("수정하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  // 저장된 순서로 todos를 정렬. 순서 배열에 없는 항목은 뒤에 붙는다.
  const sortedTodos = (() => {
    if (todoOrder.length === 0) return todos;
    const indexed = new Map(todoOrder.map((id, i) => [id, i]));
    return [...todos].sort((a, b) => {
      const ia = indexed.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const ib = indexed.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  })();

  const moveTodo = (id: string, direction: "up" | "down") => {
    const ids = sortedTodos.map((t) => t.id);
    const idx = ids.indexOf(id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    saveTodoOrder(next);
    setTodoOrder(next);
  };

  const today = todayIso();
  const baseTodos = onlyToday
    ? sortedTodos.filter((t) => t.dueDate?.slice(0, 10) === today)
    : sortedTodos;
  const visibleTodos = hideDone
    ? baseTodos.filter((t) => !t.isDone)
    : baseTodos;
  const remaining = baseTodos.filter((t) => !t.isDone).length;
  const doneCount = baseTodos.length - remaining;
  // 현재 필터 기준으로 미완료 항목 — 전체 완료 버튼의 대상이다.
  const incompleteVisible = visibleTodos.filter((t) => !t.isDone);

  const handleCompleteAll = async () => {
    if (incompleteVisible.length === 0) return;
    setActionError(null);
    // 낙관적 업데이트: UI를 먼저 완료 상태로 전환한다.
    const prevTodos = todos;
    const doneIds = new Set(incompleteVisible.map((t) => t.id));
    setTodos((prev) => prev.map((t) => (doneIds.has(t.id) ? { ...t, isDone: true } : t)));
    try {
      await Promise.all(incompleteVisible.map((t) => updateTodo(supabase, t.id, { isDone: true })));
      // RAG 재인덱싱(fire-and-forget) — 완료 상태를 임베딩에 반영.
      for (const t of incompleteVisible) {
        void reindexSource({
          sourceType: "todo",
          sourceId: t.id,
          text: todoEmbedText(t.title, true),
        });
      }
    } catch {
      setTodos(prevTodos);
      setActionError("일부 항목을 완료 처리하지 못했습니다.");
    }
  };

  return (
    <>
    <Card data-testid="todo-widget" className="h-full">
      <CardHeader className="flex-col items-stretch gap-2">
        {/* 제목 행 + 오늘/전체 토글: 좁은 카드에서 제목이 세로로 찌부러지지 않도록 별도 행으로 분리 */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="min-w-0">
            <ListTodo className="size-4 shrink-0 text-primary-accent" />
            <span className="whitespace-nowrap">할 일</span>
            {state === "ready" && (
              <Badge variant="muted" className="shrink-0">{remaining}개 남음</Badge>
            )}
            {state === "ready" && baseTodos.length > 0 && (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                {doneCount}/{baseTodos.length}
              </span>
            )}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setOnlyToday((v) => !v)}
            aria-pressed={onlyToday}
          >
            {onlyToday ? "전체 보기" : "오늘 마감"}
          </Button>
        </div>
        {state === "ready" && baseTodos.length > 0 && (
          <div className="h-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(doneCount / baseTodos.length) * 100}%` }}
            />
          </div>
        )}
        {state === "ready" && (incompleteVisible.length > 0 || doneCount > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {incompleteVisible.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCompleteAll(true)}
              >
                <CheckCheck className="size-3.5" />
                전체 완료
              </Button>
            )}
            {doneCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHideDone((v) => !v)}
                aria-pressed={hideDone}
              >
                {hideDone ? `완료 표시(${doneCount})` : "완료 숨기기"}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="할 일 추가"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleAdd}
            aria-label="추가"
          >
            <Plus />
          </Button>
        </div>

        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}

        {state === "loading" && <WidgetSkeleton />}
        {state === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              목록을 불러오지 못했습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}
        {state === "ready" && visibleTodos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {onlyToday
              ? "오늘 마감인 할 일이 없어요. ‘전체 보기’로 모두 볼 수 있어요."
              : hideDone
                ? "미완료 할 일이 없어요. 다 끝냈네요!"
                : "아직 할 일이 없어요. 위에서 추가해보세요!"}
          </p>
        )}
        {state === "ready" && visibleTodos.length > 0 && (
          <ul className="flex flex-col gap-1">
            {visibleTodos.map((todo, idx) =>
              editingId === todo.id ? (
                <li
                  key={todo.id}
                  data-testid={`todo-${todo.id}`}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(todo.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={() => saveEdit(todo.id)}
                    aria-label="저장"
                  >
                    <Check />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditingId(null)}
                    aria-label="취소"
                  >
                    <X />
                  </Button>
                </li>
              ) : (
                <li
                  key={todo.id}
                  data-testid={`todo-${todo.id}`}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => moveTodo(todo.id, "up")}
                      aria-label="위로 이동"
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTodo(todo.id, "down")}
                      aria-label="아래로 이동"
                      disabled={idx === visibleTodos.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                  <input
                    type="checkbox"
                    checked={todo.isDone}
                    onChange={() => handleToggle(todo)}
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span
                      className={
                        todo.isDone
                          ? "text-sm text-muted-foreground line-through"
                          : todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.isDone
                            ? "text-sm text-destructive"
                            : "text-sm"
                      }
                    >
                      {todo.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 leading-none">
                      {timeAgo(todo.createdAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(todo)}
                    aria-label="수정"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    aria-label="삭제"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={confirmCompleteAll}
      title="전체 완료"
      description={`현재 표시된 미완료 항목 ${incompleteVisible.length}개를 모두 완료 처리할까요?`}
      confirmLabel="전체 완료"
      onConfirm={() => {
        setConfirmCompleteAll(false);
        void handleCompleteAll();
      }}
      onCancel={() => setConfirmCompleteAll(false)}
    />
    </>
  );
}
