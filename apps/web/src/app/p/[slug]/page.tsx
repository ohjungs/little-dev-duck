import type { Metadata } from "next";
import { getPublicPage } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";
import { PublicPageView } from "@/components/PublicPageView";

// /p/[slug] — 공개 페이지 읽기 전용 뷰(비로그인 접근, (app) 인증 그룹 밖 + proxy PUBLIC_PATHS). Next 16 params=Promise.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const page = await getPublicPage(supabase, slug).catch(() => null);

  if (!page) return { title: "페이지를 찾을 수 없습니다 — Little Dev Duck" };

  return {
    title: `${page.title} — Little Dev Duck`,
    description: `${page.title} — Little Dev Duck 공개 페이지`,
    openGraph: {
      title: page.title,
      description: "Little Dev Duck 공개 페이지",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: page.title,
      description: "Little Dev Duck 공개 페이지",
    },
  };
}

export default async function PublicPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicPageView slug={slug} />;
}
