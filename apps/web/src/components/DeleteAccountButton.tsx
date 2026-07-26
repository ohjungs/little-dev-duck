"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, UserX } from "lucide-react";
import { ACCOUNT_DELETE_PHRASE } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// 2026-07-26 : 계정 - 파기 - 화면 (Phase 35 T3)
// 콘텐츠 삭제(DangerZone)와 **별도 컴포넌트로 둔다** — 되돌릴 수 없는 정도가 다르고,
// 기존에 잘 돌아가는 흐름에 분기를 끼워 넣으면 둘 다 읽기 어려워진다.
//
// **키가 없으면 이 컴포넌트 자체가 렌더되지 않는다**(상위가 판정) — 없는 기능을 보여주면
// 눌러 보고 실패한다. 그래도 서버가 다시 확인하므로 화면을 우회해도 지워지지 않는다.

export function DeleteAccountButton() {
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = phrase.trim() === ACCOUNT_DELETE_PHRASE && !busy;

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "계정 삭제에 실패했습니다.");
        setBusy(false);
        return;
      }
      // 계정이 사라졌으므로 남은 세션 쿠키를 정리하고 나간다. 실패해도 계정은 이미 없다.
      await createClient().auth.signOut().catch(() => {
        // 서버에서 계정이 지워져 토큰이 무효면 여기서 실패할 수 있다 — 이동은 그대로 진행한다.
      });
      window.location.href = "/welcome";
    } catch (e) {
      setError(e instanceof Error ? e.message : "계정 삭제에 실패했습니다.");
      setBusy(false);
    }
  };

  if (!armed) {
    return (
      <Button variant="destructive" onClick={() => setArmed(true)}>
        <UserX />
        계정까지 영구 삭제
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">
            되돌릴 수 없습니다. 계정 자체가 사라집니다.
          </p>
          <p>
            위의 모든 데이터에 더해 <b className="text-foreground">로그인 계정과
            이메일</b>이 삭제됩니다. 같은 계정으로 다시 로그인할 수 없고, 다시
            가입하면 <b className="text-foreground">새 사용자</b>가 됩니다.
          </p>
          <p className="mt-1">
            계속하려면 아래에{" "}
            <b className="text-foreground">{ACCOUNT_DELETE_PHRASE}</b> 를
            입력하세요.
          </p>
        </div>
      </div>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={ACCOUNT_DELETE_PHRASE}
        aria-label={`확인 문구 "${ACCOUNT_DELETE_PHRASE}" 입력`}
        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={!canDelete}
        >
          {busy ? <Loader2 className="animate-spin" /> : <UserX />}
          계정 영구 삭제
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setArmed(false);
            setPhrase("");
            setError(null);
          }}
          disabled={busy}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
