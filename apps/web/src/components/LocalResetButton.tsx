"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ldd: 접두사 키만 선택 초기화 — Supabase 세션 등 무관한 키는 건드리지 않는다.
function getLddKeys(): string[] {
  return Object.keys(localStorage).filter((k) => k.startsWith("ldd"));
}

export function LocalResetButton() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  const handleOpen = () => {
    setCount(getLddKeys().length);
    setOpen(true);
  };

  const handleConfirm = () => {
    getLddKeys().forEach((k) => localStorage.removeItem(k));
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <RotateCcw />
        로컬 데이터 초기화
      </Button>
      <ConfirmDialog
        open={open}
        title="로컬 데이터 초기화"
        description={`${count}개 항목이 초기화됩니다. 테마·즐겨찾기·최근 페이지 등 브라우저에 저장된 설정이 삭제됩니다.`}
        confirmLabel="초기화"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
