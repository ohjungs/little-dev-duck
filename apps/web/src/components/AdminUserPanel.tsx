"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  listAccessProfiles,
  setUserDisabledFeatures,
  setUserRole,
  type AccessProfile,
} from "@ldd/api";
import { FEATURES, ROLES, canAdminister, roleLabel, type Role } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/friendlyError";

// 2026-07-26 : 관리자 - 사용자 관리 (피드백 6-2·6-3)
// "사용자별 컨트롤할수있어야해 … 관리자 페이지에서 권한도 줘야지 모든것을 쓸수있게 하는게
// 아니라 껏다켯다 하는식으로".
//
// 권한 판정의 단일 출처는 RLS다. 이 화면은 **보여줄지 말지만** 정한다 —
// 화면에서만 숨기면 주소를 직접 치는 사람에겐 열려 있는 것과 같아서, 실제 차단은 DB 정책이 한다.
// 관리자가 아니면 정책상 자기 행 1건만 돌아오므로 목록이 비지 않고 자기 것만 보인다.

export function AdminUserPanel({ myRole }: { myRole: Role }) {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfiles(await listAccessProfiles(createClient()));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 서버 동기화
    void load();
  }, [load]);

  if (!canAdminister({ role: myRole })) {
    return (
      <p className="text-sm text-muted-foreground">
        사용자 관리는 관리자만 볼 수 있어요.
      </p>
    );
  }

  const changeRole = async (p: AccessProfile, role: Role) => {
    setNote(null);
    setBusyId(p.id);
    try {
      await setUserRole(createClient(), p.id, role);
      await load();
    } catch (err) {
      setNote(friendlyError(err, "역할을 바꾸지 못했어요."));
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeature = async (p: AccessProfile, key: string) => {
    setNote(null);
    setBusyId(p.id);
    const next = p.disabledFeatures.includes(key as never)
      ? p.disabledFeatures.filter((f) => f !== key)
      : [...p.disabledFeatures, key];
    try {
      await setUserDisabledFeatures(createClient(), p.id, next);
      await load();
    } catch (err) {
      setNote(friendlyError(err, "기능 설정을 바꾸지 못했어요."));
    } finally {
      setBusyId(null);
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
    return <p className="text-sm text-muted-foreground">사용자를 불러오지 못했어요.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {note && <p className="text-xs text-destructive">{note}</p>}
      {profiles.map((p) => (
        <div key={p.id} className="rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {busyId === p.id && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => changeRole(p, r)}
                  aria-pressed={p.role === r}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                    p.role === r
                      ? "border-primary/40 bg-primary/10 font-medium text-primary-accent"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-border/60 pt-2.5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              사용할 수 있는 기능 — 끄면 이 사용자에게서 사라집니다
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FEATURES.map((f) => {
                const off = p.disabledFeatures.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => toggleFeature(p, f.key)}
                    aria-pressed={!off}
                    title={f.description}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50",
                      off
                        ? "border-border bg-muted/60 text-muted-foreground line-through"
                        : "border-primary/30 bg-primary/[0.06] text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {profiles.length === 1 && (
        <p className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          지금은 사용자가 한 명입니다. 다른 사람이 가입하면 여기에 나타나고, 역할과 기능을
          하나씩 켜고 끌 수 있어요.
        </p>
      )}
    </div>
  );
}
