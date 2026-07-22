import { PageWorkspace } from "@/components/PageWorkspace";

// /pages — 페이지 워크스페이스(선택 없음). 트리에서 고르거나 새로 만든다.
export default function PagesIndexRoute() {
  return <PageWorkspace pageId={null} />;
}
