"use client";

import { Download, Printer, Upload, FileText, ClipboardCopy } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

// 2026-07-27 : 페이지 - 내보내기·가져오기 모달 (2차 피드백 2-2, Phase 43 T1)
// **새 기능을 만든 게 아니라 흩어진 입구를 한 곳으로 모은 것이다.** 다섯 컨트롤
// (Markdown 내보내기 · 템플릿으로 저장 · 인쇄·PDF · 텍스트 복사 · 가져오기)이 도구 모음에
// 나란히 있어서, 버튼 13개가 `max-w-3xl` 한 줄을 넘쳤다(Phase 42 T1이 `flex-wrap`으로
// 임시로 막아 둔 그 원인). 여기로 모으면 도구 모음에서 **다섯 자리가 하나로 준다.**
//
// **동작을 하나도 바꾸지 않는다.** 각 항목은 PageEditor의 기존 핸들러를 그대로 부른다 —
// 재구현은 인벤토리 위반이고, 이 Task의 값은 배치이지 로직이 아니다.
//
// 접근성은 공용 `useModalA11y`를 쓴다(Esc·포커스 트랩·복원). 새로 만들면 두 벌이 된다.

type Props = {
  open: boolean;
  onClose: () => void;
  onExportMarkdown: () => void;
  onExportTemplate: () => void;
  onPrint: () => void;
  onCopyText: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  textCopied: boolean;
};

export function PageExportDialog({
  open,
  onClose,
  onExportMarkdown,
  onExportTemplate,
  onPrint,
  onCopyText,
  onImportFile,
  textCopied,
}: Props) {
  const ref = useModalA11y<HTMLDivElement>(open, onClose);
  if (!open) return null;

  // 고르고 나면 창을 닫는다 — 내보내기는 한 번 하면 끝나는 동작이라 열어 둘 이유가 없다.
  // 텍스트 복사만 예외다: "복사됨!" 표시를 봐야 실제로 복사됐는지 알 수 있다.
  const runAndClose = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const items: {
    key: string;
    icon: React.ReactNode;
    label: string;
    hint: string;
    onClick: () => void;
  }[] = [
    {
      key: "markdown",
      icon: <Download className="size-4" />,
      label: "Markdown (.md)",
      hint: "제목을 h1로 붙여 파일로 내려받습니다",
      onClick: runAndClose(onExportMarkdown),
    },
    {
      key: "template",
      icon: <FileText className="size-4" />,
      label: "템플릿으로 저장",
      hint: "이 페이지 구조를 다른 페이지에서 다시 씁니다",
      onClick: runAndClose(onExportTemplate),
    },
    {
      key: "print",
      icon: <Printer className="size-4" />,
      label: "인쇄 · PDF",
      hint: "인쇄 대화상자에서 'PDF로 저장'을 고를 수 있습니다",
      onClick: runAndClose(onPrint),
    },
    {
      key: "copy",
      icon: <ClipboardCopy className="size-4" />,
      label: textCopied ? "복사됨!" : "텍스트 복사",
      hint: "서식 없이 본문 글자만 클립보드로",
      // 닫지 않는다 — 닫으면 "복사됨!" 표시를 볼 수 없어 됐는지 알 수 없다.
      onClick: onCopyText,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // 바깥을 눌러 닫는 것은 흔한 기대다. Esc는 훅이 담당한다.
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-export-title"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg outline-none"
        // 내용 클릭이 바깥 클릭으로 새어 나가 창이 닫히지 않게 한다.
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="page-export-title" className="text-sm font-semibold">
          내보내기 · 가져오기
        </h2>

        <div className="mt-4 flex flex-col gap-1">
          <p className="px-1 text-xs font-medium text-muted-foreground">내보내기</p>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm">{item.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <p className="px-1 text-xs font-medium text-muted-foreground">가져오기</p>
          {/* 파일 입력은 버튼으로 감쌀 수 없다(파일 선택창은 label 안의 input만 연다).
              모양만 위 항목들과 맞춘다. */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
            <span className="mt-0.5 text-muted-foreground">
              <Upload className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm">Markdown 파일 열기</span>
              <span className="block text-xs text-muted-foreground">
                지금 내용이 파일 내용으로 바뀝니다
              </span>
            </span>
            <input
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={(e) => {
                onImportFile(e);
                onClose();
              }}
              className="hidden"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
