import { NextResponse } from "next/server";
import type { AuthUser as SupabaseUser } from "@supabase/supabase-js";
import { z } from "zod";
import { fetchGithubContributions } from "@ldd/api";
import type { ContributionSummary } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { blockIfFeatureDisabled } from "@/lib/featureGate";

export const dynamic = "force-dynamic";

// GitHub 잔디는 하루 단위로만 바뀌므로 30분 캐싱으로도 충분하고, 같은 사용자의 반복 요청이
// 공유 GITHUB_TOKEN의 요율 한도를 소모하는 것도 함께 줄여준다.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<
  string,
  { summary: ContributionSummary; expiresAt: number }
>();

// 2026-07-26 : 캐시 - 만료항목 - 정리
// 넣기만 하고 지우지 않아 **한 번이라도 조회된 로그인이 영원히 남았다**(같은 날 계정 삭제
// 라우트의 호출 기록에서 찾은 것과 같은 부류라 함께 고친다). 만료된 것만 걷어내므로
// 살아 있는 캐시는 그대로다.
function pruneExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

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

  // 2026-07-30: 기능 토글을 서버에서도 확인한다. `github` 기능이 곧 "커밋 잔디: GitHub 기여도
  // 위젯"이라 이 라우트가 그 데이터를 준다.
  // **부수 효과(의도한 것)**: 이 라우트는 잔디 위젯 외에 오리 기분 신호(useDuckMood)도 쓴다.
  // 기능이 꺼지면 오리 기분은 조용히 중립으로 떨어진다 — useDuckMood가 이미 `!res.ok`를
  // 무시하도록 만들어져 있어 화면이 깨지지는 않는다. 사용자의 GitHub 데이터를 끄기로 했다면
  // 오리도 그걸 읽지 않는 게 맞다는 판단.
  const blocked = await blockIfFeatureDisabled(supabase, user.id, "github");
  if (blocked) return blocked;

  const login = getGithubLogin(user);
  if (!login) {
    return NextResponse.json({ linked: false });
  }

  const now = Date.now();
  pruneExpired(now);
  const cached = cache.get(login);
  if (cached && cached.expiresAt > now) {
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
