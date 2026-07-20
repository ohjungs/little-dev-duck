import { NextResponse } from "next/server";
import type { AuthUser as SupabaseUser } from "@supabase/supabase-js";
import { z } from "zod";
import { fetchGithubContributions } from "@ldd/api";
import type { ContributionSummary } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GitHub 잔디는 하루 단위로만 바뀌므로 30분 캐싱으로도 충분하고, 같은 사용자의 반복 요청이
// 공유 GITHUB_TOKEN의 요율 한도를 소모하는 것도 함께 줄여준다.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<
  string,
  { summary: ContributionSummary; expiresAt: number }
>();

const githubLoginSchema = z.string().min(1);

function getGithubLogin(user: SupabaseUser): string | null {
  // user_metadata는 auth.updateUser()로 사용자 본인이 임의로 덮어쓸 수 있어 신뢰하지 않는다.
  // OAuth 연동 시점에 GitHub가 내려준 값이 그대로 담기는 identities[].identity_data만 사용한다.
  const identityData = user.identities?.find(
    (identity) => identity.provider === "github",
  )?.identity_data;

  const raw = identityData?.user_name ?? identityData?.preferred_username;
  const result = githubLoginSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const login = getGithubLogin(user);
  if (!login) {
    return NextResponse.json({ linked: false });
  }

  const cached = cache.get(login);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ linked: true, summary: cached.summary });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const summary = await fetchGithubContributions(login, token);
    cache.set(login, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json({ linked: true, summary });
  } catch (error) {
    console.error("GitHub 기여 데이터 조회 실패", { login, error });
    return NextResponse.json(
      { error: "GitHub 기여 데이터를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
