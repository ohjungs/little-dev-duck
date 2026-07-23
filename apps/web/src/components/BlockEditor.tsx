"use client";

import "@blocknote/shadcn/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { Block, PartialBlock } from "@blocknote/core";
import { createClient } from "@/lib/supabase/client";

// 페이지 첨부 Storage 버킷(마이그레이션 20260722050000). 경로는 '<user_id>/<uuid>.<ext>'.
const ATTACHMENT_BUCKET = "page-attachments";
// 버킷 allowed_mime_types와 일치. 클라 가드는 친절한 에러용이고 권위 있는 차단은 버킷이 한다.
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// 저장된 content(unknown)를 BlockNote 초기값으로 변환. BlockNote는 빈 배열을 거부하므로(비어 있으면
// 예외) undefined로 넘겨 기본 빈 문단으로 시작하게 한다.
function toInitialContent(content: unknown): PartialBlock[] | undefined {
  return Array.isArray(content) && content.length > 0
    ? (content as PartialBlock[])
    : undefined;
}

// html.dark 클래스를 관찰해 BlockNote 테마를 앱 테마와 동기화(ThemeToggle이 이 클래스를 토글).
// 초기값은 마운트 시점 클래스에서 지연 초기화(이 컴포넌트는 ssr:false라 document가 항상 존재) —
// setState-in-effect 규칙을 피한다. 이후 토글은 MutationObserver가 반영.
function useDarkTheme(): "light" | "dark" {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setDark(el.classList.contains("dark")),
    );
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? "dark" : "light";
}

// BlockNote(shadcn 변형) 에디터. content 스키마는 T1과 동일한 BlockNote 블록 배열이라 데이터 마이그레이션
// 불필요. BlockNote는 브라우저 전용이므로 상위(PageEditor)에서 next/dynamic ssr:false로만 로드한다.
// onChange는 현재 문서를 상위 디바운스 저장으로 전달(서버가 plain_text를 파생). onExportReady는 현재 문서를
// Markdown으로 변환하는 함수를 상위에 넘겨 내보내기(T6)에 쓰게 한다 — 에디터 인스턴스가 여기 있으므로.
export function BlockEditor({
  initialContent,
  onChange,
  onExportReady,
  editable = true,
}: {
  initialContent: unknown;
  onChange?: (document: Block[]) => void;
  onExportReady?: (toMarkdown: () => string) => void;
  // 공개 페이지(/p/[slug])는 읽기 전용으로 같은 렌더러를 재사용(ponytail).
  editable?: boolean;
}) {
  const theme = useDarkTheme();
  const supabase = useMemo(() => createClient(), []);

  // 이미지/파일 블록 업로드(T3): 본인 폴더(<user_id>/)에 올리고 public URL을 블록에 저장. RLS가
  // 본인 폴더 쓰기만 허용하고, public 버킷이라 <img src>로 읽힌다(경로는 추측 불가한 UUID).
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      if (!ALLOWED_MIME.includes(file.type)) {
        throw new Error("이미지 파일(PNG/JPEG/WebP/GIF)만 업로드할 수 있습니다.");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw new Error(error.message);
      return supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path).data
        .publicUrl;
    },
    [supabase],
  );

  const editor = useCreateBlockNote({
    initialContent: toInitialContent(initialContent),
    uploadFile,
  });

  useEffect(() => {
    onExportReady?.(() => editor.blocksToMarkdownLossy());
  }, [editor, onExportReady]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={theme}
      onChange={onChange ? () => onChange(editor.document) : undefined}
      className="min-h-[55vh] flex-1"
    />
  );
}
