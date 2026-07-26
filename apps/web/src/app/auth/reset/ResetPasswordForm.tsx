"use client";

import { useState } from "react";
import { passwordUpdateErrorMessage } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 2026-07-26 : 인증 - 비밀번호 재설정 - 새 비밀번호 입력 (Phase 41 T3)
// 여기까지 온 사용자는 메일 링크로 **이미 세션을 받은 상태**다(/auth/callback이 교환했다).
// 그래서 현재 비밀번호를 묻지 않는다 — 잊어서 온 사람에게 물으면 재설정이 성립하지 않는다.
//
// **길이·복잡도를 여기서 검사하지 않는다(의도).** 기준은 Supabase 설정에 있고, 두 벌로 두면
// 한쪽만 고쳐진다(Phase 41 T2가 세운 방침). 기준 미달은 Supabase가 거부하고 그 오류를
// core `passwordUpdateErrorMessage`가 한국어로 바꾼다.
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // 확인란 불일치만 화면에서 막는다 — 이건 서버가 알 수 없는 것이고(둘 중 뭐가 맞는지
    // 서버는 모른다), 틀린 비밀번호로 잠기는 사고를 여기서만 막을 수 있다.
    if (password !== confirm) {
      setError("두 비밀번호가 서로 다릅니다.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(passwordUpdateErrorMessage(err.message));
        return;
      }
      // 서버 컴포넌트가 세션을 다시 읽어야 하므로 전체 이동을 쓴다(LoginForm과 같은 이유).
      window.location.assign("/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs text-[#a09684]">새 비밀번호</span>
        <Input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-[#3d362c] bg-[#141210] text-[#f4f0e6]"
        />
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs text-[#a09684]">새 비밀번호 확인</span>
        <Input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border-[#3d362c] bg-[#141210] text-[#f4f0e6]"
        />
      </label>

      {/* 화면을 보지 않는 사용자에게도 결과가 전달돼야 한다(LoginForm과 같은 계약). */}
      {error !== "" && (
        <p role="alert" className="text-left text-sm text-[#ff9d8a]">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="w-full border border-[#3d362c] bg-[#2c271f] text-[#f4f0e6] hover:bg-[#373127]"
      >
        {busy ? "처리 중…" : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}
