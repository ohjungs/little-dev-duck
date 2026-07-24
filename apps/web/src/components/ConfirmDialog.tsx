"use client";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = "확인", onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}
           tabIndex={-1} className="bg-background rounded-lg border p-6 shadow-xl max-w-sm mx-4"
           onClick={e => e.stopPropagation()}
           onKeyDown={e => { if (e.key === "Escape") onCancel(); }}>
        <h3 className="font-bold text-sm mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded border hover:bg-accent">취소</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
