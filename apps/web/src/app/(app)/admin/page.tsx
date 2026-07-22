import { Database, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReindexButton } from "@/components/ReindexButton";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">관리자</h1>
        <p className="text-sm text-muted-foreground">
          워크스페이스 데이터와 운영을 관리합니다.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Database className="size-4 text-primary-accent" />
              데이터 관리
            </CardTitle>
            <CardDescription>
              저장된 메모·할일·습관·일정을 오리가 검색할 수 있도록 임베딩을
              일괄 재생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReindexButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <ShieldCheck className="size-4 text-primary-accent" />
              운영
              <Badge variant="muted">준비 중</Badge>
            </CardTitle>
            <CardDescription>
              사용량 현황, 접근 로그, 위험 구역(계정 삭제) 등은 이후 단계에서
              열립니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              아직 준비 중인 영역입니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
