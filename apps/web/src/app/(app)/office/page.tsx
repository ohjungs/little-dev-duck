import { Building2 } from "lucide-react";
import { PixelOffice } from "@/components/PixelOffice";

export const dynamic = "force-dynamic";

// Phase 16: 픽셀 오리 오피스 — PDCA 오리들이 책상에서 작업 상태를 애니메이션으로 보여준다.
export default function OfficePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="size-6 text-primary-accent" />
          픽셀 오피스
        </h1>
        <p className="text-sm text-muted-foreground">
          기획·개발·리뷰 오리와 대장오리가 각자 책상에서 일해요. 도구 실행에 따라 상태(타이핑·읽기·빌드·
          에러)가 바뀌고, 한동안 조용하면 퇴근합니다. 오리를 클릭하면 지금 뭘 하는지 보여줘요.
        </p>
      </div>
      <PixelOffice />
    </div>
  );
}
