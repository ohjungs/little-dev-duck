import Image from "next/image";
import { CalendarClock, LogOut, Palette, User } from "lucide-react";
import { getGoogleTokens } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppearanceSetting } from "@/components/AppearanceSetting";
import { GoogleCalendarLink } from "@/components/GoogleCalendarLink";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const googleLinked = user ? !!(await getGoogleTokens(supabase, user.id)) : false;

  const displayName =
    (user?.user_metadata.full_name as string | undefined) ??
    (user?.user_metadata.name as string | undefined) ??
    user?.email ??
    "사용자";
  const email = user?.email ?? "";
  const provider = user?.app_metadata.provider ?? "이메일";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground">
          외관과 계정을 개인화하세요.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Palette className="size-4 text-primary-accent" />
              외관
            </CardTitle>
            <CardDescription>테마를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <User className="size-4 text-primary-accent" />
              프로필
            </CardTitle>
            <CardDescription>{provider} 계정으로 로그인됨.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
              <Image
                src="/duck-logo.png"
                alt=""
                width={48}
                height={48}
                className="size-12 object-cover"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <CalendarClock className="size-4 text-primary-accent" />
              Google Calendar 연동
            </CardTitle>
            <CardDescription>
              로그인 방법과 무관하게 오리가 캘린더 일정을 조회·생성할 수 있게 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleCalendarLink linked={googleLinked} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <LogOut className="size-4 text-primary-accent" />
              계정
            </CardTitle>
            <CardDescription>
              이 기기에서 로그아웃합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/auth/logout" method="post">
              <Button type="submit" variant="outline">
                <LogOut />
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
