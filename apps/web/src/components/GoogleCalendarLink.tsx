"use client";

import { CalendarClock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// GitHub 등 Google이 아닌 계정으로 로그인한 사용자도 Google Calendar만 별도로 연동할 수 있게 한다.
// linkIdentity는 signInWithOAuth와 같은 옵션 모양이지만 로그인을 바꾸지 않고 현재 계정에 identity를
// 추가한다(Supabase Identity Linking). auth/callback이 `link=google` 쿼리로 이 흐름을 구분해 토큰을 캡처.
export function GoogleCalendarLink({ linked }: { linked: boolean }) {
  const handleLink = async () => {
    const supabase = createClient();
    await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings&link=google`,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  if (linked) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="size-4 text-primary-accent" />
        연동됨 — 오리에게 캘린더 일정을 시킬 수 있어요.
      </p>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={handleLink}>
      <CalendarClock />
      Google Calendar 연동하기
    </Button>
  );
}
