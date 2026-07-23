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
          직원 오리들이 각자 책상에서 일해요. 도구 실행에 따라 상태(타이핑·읽기·빌드·에러)가 바뀌고,
          한동안 조용하면 퇴근합니다. 캔버스를 클릭해 포커스한 뒤 방향키/WASD로 대장오리(👑)를 움직여
          직원 오리 옆에서 E를 누르면 지금 뭐 하는지 물어봐요.
        </p>
      </div>
      <PixelOffice />
    </div>
  );
}
