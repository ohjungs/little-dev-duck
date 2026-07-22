import { PageWorkspace } from "@/components/PageWorkspace";

// /pages/[id] — 특정 페이지 편집. Next 16은 params가 Promise.
export default async function PageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageWorkspace pageId={id} />;
}
