import type { Metadata } from "next";
import { getPublicPage } from "@ldd/api";
import { publicPageMetaCopy } from "@ldd/core";
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

  // 2026-07-25 : 공개공유 - 메타데이터 - 브랜드중복
  // title에 브랜드를 직접 붙이지 않는다 — root layout의 title.template("%s — Little Dev Duck")이
  // 문자열 title에 자동으로 붙이므로 직접 붙이면 브랜드가 두 번 나온다.
  if (!page) {
    return { title: "페이지를 찾을 수 없습니다", robots: { index: false } };
  }

  const copy = publicPageMetaCopy(page.title);
  // 카드 이미지는 루트 opengraph-image가 제공한다(images 미지정 시 파일 규약이 자동 주입).
  return {
    title: copy.title,
    description: copy.description,
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "article",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
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
