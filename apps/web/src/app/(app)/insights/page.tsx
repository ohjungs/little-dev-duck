import { BarChart3 } from "lucide-react";
import { InsightsView } from "@/components/InsightsView";

export const dynamic = "force-dynamic";

// Phase 12 T6: 요약 통계 페이지 — 할 일·페이지·메모·습관·기사·오리 레벨을 한눈에.
export default function InsightsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="size-6 text-primary-accent" />
          통계
        </h1>
        <p className="text-sm text-muted-foreground">
          내 워크스페이스의 현황을 한눈에 봅니다.
        </p>
      </div>
      <InsightsView />
    </div>
  );
}
