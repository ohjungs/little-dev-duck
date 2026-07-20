"use client";

import Image from "next/image";
import { Button } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "github";

export default function LoginPage() {
  const handleLogin = async (provider: Provider) => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <Image
        src="/duck-logo.png"
        alt="Little Dev Duck 로고"
        width={112}
        height={112}
        priority
        style={{ borderRadius: "50%" }}
      />
      <h1 style={{ color: "var(--ldd-color-text)" }}>Little Dev Duck</h1>
      <Button onClick={() => handleLogin("google")}>Google로 로그인</Button>
      <Button onClick={() => handleLogin("github")}>GitHub로 로그인</Button>
    </main>
  );
}
