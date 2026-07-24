"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GitHubMark } from "@/components/ui/github-mark";

type Provider = "google" | "github";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function LoginForm() {
  const handleLogin = async (provider: Provider) => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Phase 10 T3: Google 로그인에 Calendar scope를 함께 요청해 오리가 일정을 조회/생성할 수 있게
        // 한다. access_type=offline+prompt=consent가 있어야 refresh_token이 발급된다(공식 문서 실측,
        // 없으면 access_token만 오고 만료 후 재로그인 필요). GitHub는 Calendar와 무관해 옵션 없음.
        ...(provider === "google"
          ? {
              scopes: "https://www.googleapis.com/auth/calendar.events",
              queryParams: { access_type: "offline", prompt: "consent" },
            }
          : {}),
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary/40 to-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl leading-none" role="img" aria-label="오리">
            🦆
          </span>
          <Image
            src="/duck-logo.png"
            alt="Little Dev Duck 로고"
            width={72}
            height={72}
            priority
            className="rounded-full ring-1 ring-border"
          />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              Little Dev Duck
            </h1>
            <p className="text-sm text-muted-foreground">
              3D 아기오리 AI 비서와 함께하는 워크스페이스
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleLogin("google")}
          >
            <GoogleMark />
            Google로 계속하기
          </Button>
          <Button
            size="lg"
            className="w-full bg-[#1c1917] text-white hover:bg-[#1c1917]/90"
            onClick={() => handleLogin("github")}
          >
            <GitHubMark />
            GitHub로 계속하기
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <span className="font-medium text-foreground">
            Google 또는 GitHub로 시작하세요
          </span>
        </p>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        계속하면 서비스 약관에 동의하는 것으로 간주됩니다.
      </p>
    </main>
  );
}
