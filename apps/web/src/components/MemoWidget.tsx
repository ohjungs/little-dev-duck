"use client";

import { useEffect, useState } from "react";
import { createMemo, deleteMemo, listMemos, updateMemo } from "@ldd/api";
import type { Memo } from "@ldd/core";
import { Button, Card, Input } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";

type LoadState = "loading" | "error" | "ready";

const textareaStyle = {
  background: "var(--ldd-color-bg)",
  color: "var(--ldd-color-text)",
  border: "1px solid var(--ldd-color-accent)",
  borderRadius: "6px",
  padding: "0.5rem",
  fontFamily: "inherit",
  fontSize: "1rem",
} as const;

export function MemoWidget() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const supabase = createClient();

  const fetchMemos = async () => {
    try {
      const data = await listMemos(supabase);
      setMemos(data);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 이벤트 핸들러(reload)가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    setState("loading");
    fetchMemos();
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setActionError(null);
    try {
      const created = await createMemo(supabase, {
        title,
        content: newContent,
      });
      setMemos((prev) => [created, ...prev]);
      setNewTitle("");
      setNewContent("");
    } catch {
      setActionError("메모를 추가하지 못했습니다.");
    }
  };

  const startEdit = (memo: Memo) => {
    setEditingId(memo.id);
    setEditTitle(memo.title);
    setEditContent(memo.content);
  };

  const saveEdit = async (id: string) => {
    const title = editTitle.trim();
    if (!title) return;
    const prevMemos = memos;
    setMemos((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, title, content: editContent } : m,
      ),
    );
    setEditingId(null);
    try {
      await updateMemo(supabase, id, { title, content: editContent });
    } catch {
      setMemos(prevMemos);
      setActionError("메모를 수정하지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevMemos = memos;
    setMemos((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMemo(supabase, id);
    } catch {
      setMemos(prevMemos);
      setActionError("메모를 삭제하지 못했습니다.");
    }
  };

  return (
    <Card style={{ width: "100%", maxWidth: "420px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>메모</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="제목"
        />
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="내용"
          rows={3}
          style={textareaStyle}
        />
        <Button type="button" onClick={handleAdd}>
          메모 추가
        </Button>
      </div>

      {actionError && (
        <p role="alert" style={{ color: "#b3261e", marginBottom: "0.5rem" }}>
          {actionError}
        </p>
      )}

      {state === "loading" && <p>불러오는 중...</p>}
      {state === "error" && (
        <div>
          <p>목록을 불러오지 못했습니다.</p>
          <Button type="button" onClick={reload}>
            다시 시도
          </Button>
        </div>
      )}
      {state === "ready" && memos.length === 0 && <p>메모가 없습니다.</p>}
      {state === "ready" && memos.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {memos.map((memo) =>
            editingId === memo.id ? (
              <li
                key={memo.id}
                style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
              >
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  style={textareaStyle}
                />
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <Button type="button" onClick={() => saveEdit(memo.id)}>
                    저장
                  </Button>
                  <Button type="button" onClick={() => setEditingId(null)}>
                    취소
                  </Button>
                </div>
              </li>
            ) : (
              <li key={memo.id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{memo.title}</strong>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(memo)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(memo.id)}
                      aria-label="삭제"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
                  {memo.content}
                </p>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}
