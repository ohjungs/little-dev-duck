import { PublicPageView } from "@/components/PublicPageView";

// /p/[slug] — 공개 페이지 읽기 전용 뷰(비로그인 접근, (app) 인증 그룹 밖 + proxy PUBLIC_PATHS). Next 16 params=Promise.
export default async function PublicPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicPageView slug={slug} />;
}
