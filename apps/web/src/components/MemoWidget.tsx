"use client";

import { useEffect, useState } from "react";
import { createMemo, deleteMemo, listMemos, updateMemo } from "@ldd/api";
import type { Memo } from "@ldd/core";
import { Button, Card } from "@ldd/ui";
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
  resize: "vertical",
} as const;

// 스티커 메모 카드 시각 스타일. 노트마다 살짝 다른 기울기로 손으로 붙인 느낌을 준다.
const NOTE_ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2deg", "0.5deg"];

function noteStyle(index: number) {
  return {
    background: "var(--ldd-color-bg)",
    border: "1px solid var(--ldd-color-accent)",
    borderRadius: "4px",
    padding: "0.75rem",
    width: "160px",
    minHeight: "140px",
    boxShadow: "2px 3px 6px rgba(0, 0, 0, 0.15)",
    transform: `rotate(${NOTE_ROTATIONS[index % NOTE_ROTATIONS.length]})`,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  };
}

export function MemoWidget() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
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
    const content = newContent.trim();
    if (!content) return;
    setActionError(null);
    try {
      const created = await createMemo(supabase, { content });
      setMemos((prev) => [created, ...prev]);
      setNewContent("");
    } catch {
      setActionError("메모를 추가하지 못했습니다.");
    }
  };

  const startEdit = (memo: Memo) => {
    setEditingId(memo.id);
    setEditContent(memo.content);
  };

  const saveEdit = async (id: string) => {
    const content = editContent.trim();
    if (!content) return;
    const prevMemos = memos;
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m)),
    );
    try {
      await updateMemo(supabase, id, { content });
      setEditingId(null);
    } catch {
      setMemos(prevMemos);
      setActionError("메모를 수정하지 못했습니다. 다시 시도해 주세요.");
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
    <Card data-testid="memo-widget" style={{ width: "100%", maxWidth: "560px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>메모</h2>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
          placeholder="메모 (Ctrl+Enter로 추가)"
          rows={2}
          style={{ ...textareaStyle, flex: 1 }}
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {memos.map((memo, index) =>
            editingId === memo.id ? (
              <div
                key={memo.id}
                data-testid={`memo-${memo.id}`}
                style={noteStyle(index)}
              >
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  autoFocus
                  style={{ ...textareaStyle, flex: 1, border: "none", padding: 0 }}
                />
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <Button
                    type="button"
                    onClick={() => saveEdit(memo.id)}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                  >
                    저장
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setEditingId(null)}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={memo.id}
                data-testid={`memo-${memo.id}`}
                style={noteStyle(index)}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => startEdit(memo)}
                    aria-label="수정"
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
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    flex: 1,
                    margin: 0,
                  }}
                >
                  {memo.content}
                </p>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
