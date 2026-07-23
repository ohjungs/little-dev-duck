"use client";

import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GitHubMark } from "@/components/ui/github-mark";

// GitHub 이슈 생성은 repo scope(쓰기 권한)가 필요한데, 기본 GitHub 로그인 버튼(LoginForm.tsx)은 로그인용
// 최소 권한만 요청한다 — 그래서 원하는 사용자만 여기서 별도 동의를 받는다. 주 로그인이 이미 GitHub라면
// 같은 provider를 linkIdentity로 다시 연결하는 건 중복 identity로 거부될 수 있어(미확인, 실기 검증 필요)
// signInWithOAuth로 같은 계정에 repo scope를 추가 동의받는 재로그인을 쓴다. 주 로그인이 GitHub가 아니면
// linkIdentity로 새 identity를 추가한다(GoogleCalendarLink와 동일 패턴).
// 주의(코드 리뷰 지적, 2026-07-23): signInWithOAuth 분기는 linkIdentity와 달리 세션을 통째로 재발급한다 —
// GitHub 동의 화면에서 사용자가 스스로 다른 계정을 선택하면 로그인 계정 자체가 그 계정으로 바뀐다(자기
// 자신의 브라우저 선택이라 크로스유저 침해는 아니지만, 의도치 않은 계정 전환 UX 위험은 있음). 개인
// 워크스페이스 단일 사용자 모델이라 낮은 우선순위로 수용, 실기 검증 시 재확인.
export function GitHubIssuesLink({
  linked,
  isPrimaryGithub,
}: {
  linked: boolean;
  isPrimaryGithub: boolean;
}) {
  const handleLink = async () => {
    const supabase = createClient();
    const options = {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings&link=github`,
      scopes: "repo",
    };
    if (isPrimaryGithub) {
      await supabase.auth.signInWithOAuth({ provider: "github", options });
    } else {
      await supabase.auth.linkIdentity({ provider: "github", options });
    }
  };

  if (linked) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="size-4 text-primary-accent" />
        연동됨 — 오리에게 GitHub 이슈를 시킬 수 있어요.
      </p>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={handleLink}>
      <GitHubMark />
      GitHub 이슈 연동하기
    </Button>
  );
}
