"use client";

import { useState } from "react";
import { authErrorMessage } from "@ldd/core";
import { DuckVideo } from "@/components/DuckVideo";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitHubMark } from "@/components/ui/github-mark";

type Provider = "google" | "github";

// 2026-07-26 : 로그인 - 이메일 - 요청 0번 (Phase 41 T1)
// 확정 스택은 `Auth Google+GitHub`이었다(CLAUDE.md 2절). **사용자가 명시적으로 이메일 로그인을
// 요청**해 그 판단을 뒤집는다(우선순위: 사용자 지시 > 확정 계약). 근거는 DECISIONS.md에 적는다.
//
// **OAuth를 위에, 이메일을 아래에 둔다.** 기존 사용자는 전부 OAuth로 가입했으므로 이메일 폼을
// 위에 놓으면 그 사람들이 "내 계정이 없어졌나" 하고 헷갈린다.
//
// **별 화면을 만들지 않고 한 폼에서 탭으로 나눈다.** 라우트를 늘리면 이 저장소가 `/login`에서
// **두 번 밟은** 정적 프리렌더 + nonce CSP 함정을 다시 밟는다(처음엔 실사용자가 발견해 줬다).
// `/login`의 `force-dynamic`은 그대로 두고, Phase 38의 `buildStaticGuard`가 계속 검사한다.
//
// **오류 문구는 core `authErrorMessage`가 만든다** — 자격증명 실패의 원인을 구분하지 않아
// 계정 열거를 막는다. web `friendlyError`는 모르는 오류의 원문을 그대로 보여주는 방침이라
// 인증에는 쓸 수 없다(영문 노출 + 열거 방지 붕괴).
type Mode = "signin" | "signup";

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
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) {
          setError(authErrorMessage(err.message));
          return;
        }
        // 로그인 성공 시 서버 컴포넌트가 세션을 다시 읽어야 하므로 전체 이동을 쓴다.
        window.location.assign("/");
        return;
      }

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) {
        setError(authErrorMessage(err.message));
        return;
      }
      // 메일 확인이 켜져 있으면 세션이 없다 — 그때는 "메일을 확인하라"가 유일한 다음 단계다.
      // 꺼져 있으면 바로 세션이 생기므로 로그인과 같게 이동한다.
      if (data.session) {
        window.location.assign("/");
        return;
      }
      // **가입 결과로 "이미 있는 계정"을 알려주지 않는다**(계정 열거 차단). Supabase가 기존
      // 이메일에 대해 오류 없이 세션 없는 응답을 주는 경우도 여기로 들어와 같은 문구가 된다.
      setNotice("확인 메일을 보냈습니다. 받은 메일의 링크를 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  };

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
      {/* 2026-07-26 : 로그인 - 카드 색 - 오프닝 영상 정합
          오프닝 영상은 검은 배경에 금빛 광선이 뻗는 시네마틱 구도라 배경을 투명하게 뺄 수 없다
          (오리 외곽선이 진한 갈색이어서 어두운 배경과 함께 갉힌다). 그래서 반대로 카드를 영상의
          배경색에 맞췄다 — 밝은 카드 안에 검은 사각형이 박히는 이질감을 없애기 위한 것이고,
          테마 토큰 대신 고정 색을 쓰는 이유는 다크 모드의 --card(#221e18)가 영상 배경보다 밝아
          같은 이음선이 다시 생기기 때문이다. 로그인은 전체화면 스플래시라 항상 어두워도 무리가 없다. */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#2b2620] bg-[#070705] shadow-lg">
        {/* 영상을 카드 폭 전체로 붙여 좌우 경계를 없앤다. 남는 접합면은 영상 아래쪽 한 줄뿐이고,
            카드 색을 영상 하단 실측색(#070705)과 같게 맞춰 그 줄도 보이지 않게 했다. */}
        <DuckVideo surface="login" className="w-full" />

        <div className="flex flex-col gap-5 px-8 pb-8 pt-5 text-center">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#f4f0e6]">
              Little Dev Duck
            </h1>
            <p className="text-sm text-[#a09684]">
              아기오리 AI 비서와 함께하는 워크스페이스
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full border-transparent bg-white text-[#1f1b16] hover:bg-white/90"
              onClick={() => handleLogin("google")}
            >
              <GoogleMark />
              Google로 계속하기
            </Button>
            <Button
              size="lg"
              className="w-full border border-[#3d362c] bg-[#231f19] text-[#f4f0e6] hover:bg-[#2c271f]"
              onClick={() => handleLogin("github")}
            >
              <GitHubMark />
              GitHub로 계속하기
            </Button>
          </div>

          {/* 구분선. OAuth가 기본 경로이고 이메일은 대안임을 시각적으로도 알린다. */}
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#3d362c]" />
            <span className="text-xs text-[#8d8474]">또는</span>
            <span className="h-px flex-1 bg-[#3d362c]" />
          </div>

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            {/* 탭. 라디오가 아니라 버튼 두 개로 두고 aria-pressed로 상태를 알린다 —
                한 화면 안의 모드 전환이라 라우트·폼이 갈리지 않는다. */}
            <div
              className="flex gap-1 rounded-lg border border-[#3d362c] bg-[#141210] p-1"
              role="group"
              aria-label="이메일 로그인 또는 가입 선택"
            >
              {(
                [
                  ["signin", "로그인"],
                  ["signup", "가입"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError("");
                    setNotice("");
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    mode === value
                      ? "bg-[#2c271f] font-medium text-[#f4f0e6]"
                      : "text-[#8d8474] hover:text-[#e6e0d2]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-left">
              <span className="text-xs text-[#a09684]">이메일</span>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-[#3d362c] bg-[#141210] text-[#f4f0e6] placeholder:text-[#6f6757]"
              />
            </label>

            <label className="flex flex-col gap-1 text-left">
              <span className="text-xs text-[#a09684]">비밀번호</span>
              <Input
                type="password"
                required
                // 브라우저 비밀번호 관리자가 저장·제안을 올바르게 하도록 모드에 따라 나눈다.
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#3d362c] bg-[#141210] text-[#f4f0e6]"
              />
            </label>

            {/* 오류·안내는 role로 알린다 — 화면을 보지 않는 사용자에게도 결과가 전달돼야 한다. */}
            {error !== "" && (
              <p role="alert" className="text-left text-sm text-[#ff9d8a]">
                {error}
              </p>
            )}
            {notice !== "" && (
              <p role="status" className="text-left text-sm text-[#9fd39a]">
                {notice}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="w-full border border-[#3d362c] bg-[#2c271f] text-[#f4f0e6] hover:bg-[#373127]"
            >
              {busy
                ? "처리 중…"
                : mode === "signin"
                  ? "이메일로 로그인"
                  : "이메일로 가입"}
            </Button>
          </form>

          {/* break-keep: 모바일에서 "이메일로"가 "이/메일로"로 끊겼다(스크린샷에서 확인).
              globals.css가 에디터 본문에 같은 규칙을 이미 쓰고 있다 — 같은 판단을 여기에도 적용. */}
          <p className="break-keep text-sm text-[#8d8474]">
            계정이 없으신가요?{" "}
            <span className="font-medium text-[#e6e0d2]">
              Google·GitHub 또는 이메일로 시작하세요
            </span>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        계속하면 서비스 약관에 동의하는 것으로 간주됩니다.
      </p>
    </main>
  );
}
