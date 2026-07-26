"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getMyAccess, updateMyProfile } from "@ldd/api";
import { roleLabel, type Role } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// 2026-07-26 : 설정 - 프로필 (피드백 6-4)
// "왼쪽아래 계정정보도 사용자가 프로필설정가능하게 해야지".
// 이름은 사이드바 하단·오리 인사·공유 페이지에 그대로 쓰이므로 여기서 바꾸면 전부 따라 바뀐다.
//
// 역할은 **읽기 전용으로 보여만 준다.** 여기서 바꿀 수 있으면 누구나 스스로 관리자가 된다
// (api updateMyProfile도 역할 키를 아예 받지 않는다 — 화면과 API 양쪽에서 막는다).

export function ProfileSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await getMyAccess(createClient());
      setName(me.displayName);
      setEmail(me.email);
      setRole(me.role);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 서버 동기화
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    setSaving(true);
    try {
      await updateMyProfile(createClient(), { displayName: name });
      // 이름은 서버 컴포넌트(사이드바)가 렌더한 값이라 이 화면만 바뀐다 —
      // 새로고침해야 반영된다는 걸 숨기지 않고 말한다.
      setNote("저장했어요. 사이드바 이름은 새로고침하면 바뀝니다.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 불러오는 중...
      </p>
    );
  }
  if (state === "error") {
    return <p className="text-sm text-muted-foreground">프로필을 불러오지 못했어요.</p>;
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">이름</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">이메일</span>
        {/* 이메일은 로그인 수단이라 여기서 바꿀 수 없다(Google/GitHub 계정에 묶여 있다). */}
        <p className="text-sm text-muted-foreground">{email || "-"}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">역할</span>
        <p className="text-sm">
          {roleLabel(role)}
          <span className="ml-2 text-xs text-muted-foreground">
            역할은 관리자만 바꿀 수 있어요
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving || name.trim().length === 0}>
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          저장
        </Button>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
    </form>
  );
}
