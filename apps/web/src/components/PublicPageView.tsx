"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getPublicPage, type PublicPage } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";

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
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <div className="mx-auto max-w-3xl px-6 py-20 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (state === "notfound" || !page) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <span className="text-5xl">404</span>
          <p className="text-lg font-semibold tracking-tight">이 페이지를 찾을 수 없어요</p>
          <p className="text-sm text-muted-foreground">
            링크가 잘못됐거나 페이지가 비공개로 전환됐을 수 있어요.
          </p>
          <Link
            href="/welcome"
            className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            Little Dev Duck 시작하기
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-10">
        <div className="mb-6 px-4">
          {page.icon && (
            <span className="mb-3 block text-4xl" aria-hidden="true">
              {page.icon}
            </span>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {page.title || "제목 없음"}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            마지막 수정: {timeAgo(page.updatedAt)}
          </p>
        </div>
        <BlockEditor initialContent={page.content} editable={false} />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
        <Link href="/welcome" className="flex items-center gap-2 font-semibold tracking-tight">
          Little Dev Duck
        </Link>
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          공개 페이지
        </span>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <Link
        href="/welcome"
        className="underline-offset-4 hover:underline"
      >
        Little Dev Duck로 만들었어요
      </Link>
    </footer>
  );
}
