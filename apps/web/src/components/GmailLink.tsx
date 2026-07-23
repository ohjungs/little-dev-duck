"use client";

import { Check, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Calendar와 같은 Google 프로바이더를 쓰지만 별개 scope(gmail.modify)라 별도 동의를 받는다
// (GoogleCalendarLink.tsx와 동일 패턴 — linkIdentity로 현재 계정에 Google identity를 추가/갱신).
// auth/callback이 `link=gmail` 쿼리로 이 흐름을 구분해 user_gmail_tokens에 저장한다.
export function GmailLink({ linked }: { linked: boolean }) {
  const handleLink = async () => {
    const supabase = createClient();
    await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings&link=gmail`,
        scopes: "https://www.googleapis.com/auth/gmail.modify",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  if (linked) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="size-4 text-primary-accent" />
        연동됨 — 오리에게 이메일 조회·휴지통 이동을 시킬 수 있어요. (영구삭제는 하지 않아요)
      </p>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={handleLink}>
      <Mail />
      Gmail 연동하기
    </Button>
  );
}
