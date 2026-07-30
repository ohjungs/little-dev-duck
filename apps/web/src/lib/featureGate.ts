import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMyAccess } from "@ldd/api";
import { canUseFeature, type FeatureKey } from "@ldd/core";

// 2026-07-30 : 보안 - 기능토글 - 서버강제 (감사 후속에서 발견)
//
// core `canUseFeature`는 "화면·API 양쪽이 같은 함수를 쓴다 — 화면에서만 숨기면 주소를 직접
// 치는 사람에겐 열려 있는 것과 같다"고 주석에 적어 뒀지만, **실제로 API 라우트에서 쓰는 곳이
// 하나도 없었다.** 관리자가 `duck-chat`을 꺼도(또는 역할을 customer로 내려도) `/api/ai/agent`에
// 직접 POST하면 오리가 답하고 도구까지 실행했다.
//
// 여기가 그 판정을 서버로 들여오는 단일 지점이다. 라우트마다 각자 구현하면 갈라진다
// (이 저장소 L-21: "복사되는 순간 구멍"). `apiFeatureGate.test.ts`가 보호 대상 라우트가
// 실제로 이 검사를 타는지 잠근다.
//
// 반환값 규약: 차단이면 `NextResponse`(403), 통과면 null — 호출부는 `if (blocked) return blocked;`.
// 401(로그인 필요)과 구분해 **403**을 쓴다. 로그인한 사용자에게 401을 주면 "다시 로그인하라"는
// 잘못된 안내가 된다.
export async function blockIfFeatureDisabled(
  supabase: SupabaseClient,
  userId: string,
  feature: FeatureKey,
): Promise<NextResponse | null> {
  // userId를 넘겨 auth.getUser() 재호출을 피한다(라우트가 인증 단계에서 이미 받았다).
  const access = await getMyAccess(supabase, userId);
  if (canUseFeature(access, feature)) return null;
  return NextResponse.json(
    { error: "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요." },
    { status: 403 },
  );
}
