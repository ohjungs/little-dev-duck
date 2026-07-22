"use client";

import { useEffect, useState } from "react";
import { Check, ListTodo, Loader2, Pencil, Plus, X } from "lucide-react";
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
import { emitTodosChanged } from "@/lib/todoSignal";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoadState = "loading" | "error" | "ready";

export function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          await applyXpAward(supabase, "todoComplete");
          emitXpChanged();
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

  const today = todayIso();
  const visibleTodos = onlyToday
    ? todos.filter((t) => t.dueDate?.slice(0, 10) === today)
    : todos;
  const remaining = visibleTodos.filter((t) => !t.isDone).length;

  return (
    <Card data-testid="todo-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <ListTodo className="size-4 text-primary-accent" />
          할 일
          {state === "ready" && (
            <Badge variant="muted">{remaining}개 남음</Badge>
          )}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOnlyToday((v) => !v)}
        >
          {onlyToday ? "전체" : "오늘만"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
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

        {state === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> 불러오는 중...
          </p>
        )}
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
            할 일이 없습니다.
          </p>
        )}
        {state === "ready" && visibleTodos.length > 0 && (
          <ul className="flex flex-col gap-1">
            {visibleTodos.map((todo) =>
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
                  <input
                    type="checkbox"
                    checked={todo.isDone}
                    onChange={() => handleToggle(todo)}
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span
                    className={
                      todo.isDone
                        ? "flex-1 text-sm text-muted-foreground line-through"
                        : "flex-1 text-sm"
                    }
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(todo)}
                    aria-label="수정"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    aria-label="삭제"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
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
  );
}
