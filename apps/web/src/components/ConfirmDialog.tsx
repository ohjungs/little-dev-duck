"use client";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = "확인", onConfirm, onCancel }: Props) {
  // 접근성은 공용 useModalA11y를 쓴다(Esc·Tab 포커스 트랩·닫힐 때 포커스 복원). 새로 만들면 두 벌이 된다.
  const dialogRef = useModalA11y<HTMLDivElement>(open, onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}
           tabIndex={-1} className="bg-background rounded-lg border p-6 shadow-xl max-w-sm mx-4"
           onClick={e => e.stopPropagation()}>
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
