"use client";

import { useEffect, useState } from "react";
import {
  applyXpAward,
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@ldd/api";
import type { Todo } from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { Button, Card, Input, Spinner } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";
import { emitTodosChanged } from "@/lib/todoSignal";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";

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
      // RAG 인덱싱(fire-and-forget). 실패해도 저장 흐름을 막지 않는다.
      void reindexSource({ sourceType: "todo", sourceId: created.id, text: title });
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
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    try {
      await updateTodo(supabase, id, { title });
      setEditingId(null);
      void reindexSource({ sourceType: "todo", sourceId: id, text: title });
    } catch {
      setTodos(prevTodos);
      setActionError("수정하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const today = todayIso();
  const visibleTodos = onlyToday
    ? todos.filter((t) => t.dueDate?.slice(0, 10) === today)
    : todos;

  return (
    <Card data-testid="todo-widget" style={{ width: "100%", maxWidth: "420px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem" }}>TO-DO</h2>
        <Button
          type="button"
          onClick={() => setOnlyToday((v) => !v)}
          style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
        >
          {onlyToday ? "전체 보기" : "오늘만 보기"}
        </Button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="할 일 추가"
          style={{ flex: 1 }}
        />
        <Button type="button" onClick={handleAdd}>
          추가
        </Button>
      </div>

      {actionError && (
        <p role="alert" style={{ color: "#b3261e", marginBottom: "0.5rem" }}>
          {actionError}
        </p>
      )}

      {state === "loading" && (
        <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Spinner size={14} /> 불러오는 중...
        </p>
      )}
      {state === "error" && (
        <div>
          <p>목록을 불러오지 못했습니다.</p>
          <Button type="button" onClick={reload}>
            다시 시도
          </Button>
        </div>
      )}
      {state === "ready" && visibleTodos.length === 0 && (
        <p>할 일이 없습니다.</p>
      )}
      {state === "ready" && visibleTodos.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {visibleTodos.map((todo) =>
            editingId === todo.id ? (
              <li
                key={todo.id}
                data-testid={`todo-${todo.id}`}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(todo.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  onClick={() => saveEdit(todo.id)}
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                >
                  저장
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditingId(null)}
                  style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                >
                  취소
                </Button>
              </li>
            ) : (
              <li
                key={todo.id}
                data-testid={`todo-${todo.id}`}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <input
                  type="checkbox"
                  checked={todo.isDone}
                  onChange={() => handleToggle(todo)}
                />
                <span
                  style={{
                    flex: 1,
                    textDecoration: todo.isDone ? "line-through" : "none",
                    opacity: todo.isDone ? 0.6 : 1,
                  }}
                >
                  {todo.title}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(todo)}
                  aria-label="수정"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  aria-label="삭제"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}
