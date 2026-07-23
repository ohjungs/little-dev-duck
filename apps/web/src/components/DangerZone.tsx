"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { deleteAllMyData } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Phase 13 T3 1단계: 로그인 사용자가 자기 모든 콘텐츠를 삭제한다. 되돌리기 불가라(안전 규칙)
// 문구 타이핑 강한 확인 게이트를 둔다. 삭제 후 로그아웃. 계정(auth) 자체 삭제는 2단계(Edge Function).
const CONFIRM_PHRASE = "삭제합니다";

export function DangerZone({ userId }: { userId: string }) {
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = phrase.trim() === CONFIRM_PHRASE && !busy;

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await deleteAllMyData(supabase, userId);
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
      setBusy(false);
    }
  };

  if (!armed) {
    return (
      <Button variant="destructive" onClick={() => setArmed(true)}>
        <Trash2 />
        모든 데이터 삭제
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">되돌릴 수 없습니다.</p>
          <p>
            할 일·메모·습관·뽀모도로·캘린더·페이지·버전 기록·오리 상태·활동 기록·외부 연동
            토큰·첨부 파일이 모두 영구 삭제됩니다. (로그인 계정 자체는 유지돼 다시 사용할 수
            있어요.)
          </p>
          <p className="mt-1">
            계속하려면 아래에 <b className="text-foreground">{CONFIRM_PHRASE}</b> 를
            입력하세요.
          </p>
        </div>
      </div>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        aria-label={`확인 문구 "${CONFIRM_PHRASE}" 입력`}
        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={!canDelete}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
          영구 삭제
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
