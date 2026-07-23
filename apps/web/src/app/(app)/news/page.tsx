import { Newspaper } from "lucide-react";
import { NewsReader } from "@/components/NewsReader";

export const dynamic = "force-dynamic";

// Phase 15: 뉴스 브리핑 리더 — 피드 관리 + 수집 + 3줄 요약 기사 목록.
export default function NewsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Newspaper className="size-6 text-primary-accent" />
          뉴스 브리핑
        </h1>
        <p className="text-sm text-muted-foreground">
          RSS 피드를 모아 오리가 사실만 3줄로 요약해 드려요. 원문 링크로 언제든 넘어갈 수 있어요.
        </p>
      </div>
      <NewsReader />
    </div>
  );
}
