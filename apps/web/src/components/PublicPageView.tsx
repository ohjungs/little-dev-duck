"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getPublicPage, type PublicPage } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";

// PageEditor와 동일하게 BlockNote는 브라우저 전용이라 ssr:false 동적 로드. 읽기 전용(editable=false).
const BlockEditor = dynamic(
  () => import("@/components/BlockEditor").then((m) => m.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[55vh] flex-1 animate-pulse rounded-md bg-muted/40" />
    ),
  },
);

type ViewState = "loading" | "notfound" | "ready";

// 공개 페이지 뷰(/p/[slug]). 비로그인도 접근 — getPublicPage는 열거 방지 RPC(get_public_page)로
// is_public=true인 그 slug 한 건만 가져온다. 없으면(비공개/오타) "찾을 수 없음".
export function PublicPageView({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<ViewState>("loading");
  const [page, setPage] = useState<PublicPage | null>(null);

  useEffect(() => {
    getPublicPage(supabase, slug).then(
      (p) => {
        if (p) {
          setPage(p);
          setState("ready");
        } else {
          setState("notfound");
        }
      },
      () => setState("notfound"),
    );
  }, [supabase, slug]);

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (state === "notfound" || !page) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-muted-foreground">
        공개된 페이지를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-2 py-10">
      <h1 className="px-4 text-3xl font-bold tracking-tight">
        {page.title || "제목 없음"}
      </h1>
      <BlockEditor initialContent={page.content} editable={false} />
      <p className="px-4 pt-6 text-xs text-muted-foreground">
        Little Dev Duck로 공유된 페이지
      </p>
    </div>
  );
}
