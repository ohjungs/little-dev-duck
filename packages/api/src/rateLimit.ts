// 인메모리 per-key 슬라이딩 윈도우 레이트리밋. 서버리스 인스턴스별 카운터라 완벽하진 않지만,
// 솔로 v1에서 Gemini 무료 쿼터를 폭주 요청으로부터 지키는 1차 방어로 충분하다.
// ponytail: 인스턴스별 근사. 멀티 인스턴스 정확성이 필요하면 Upstash/Redis로 교체.
//
// 2026-07-26 : 레이트리밋 - 키누수 (Phase 36)
// 전에는 키를 넣기만 하고 지우지 않아 **한 번이라도 요청한 키가 영원히 남았다.** 전역 키
// (`keepalive`)만 쓸 때는 티가 안 났지만, **사용자별 키**(`account-delete:<uid>`)를 쓰면
// 사용자 수만큼 계속 커진다.
//
// **키마다 창 길이가 다르다는 게 정리의 걸림돌이었다.** 지금 호출의 windowMs로 남의 키를
// 재면 안 된다 — 한 시간짜리 창을 쓰는 키가 1초짜리 호출 때문에 지워진다.
// 그래서 **창을 키와 함께 저장**하고, 각 키를 자기 창으로만 판정한다.
type Bucket = { times: number[]; windowMs: number };
const buckets = new Map<string, Bucket>();

// 자기 창을 다 지난 키를 걷어낸다. 살아 있는 키는 건드리지 않는다.
function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    const last = bucket.times[bucket.times.length - 1];
    if (last === undefined || now - last >= bucket.windowMs) buckets.delete(key);
  }
}

// now는 테스트 주입용(기본 Date.now). limit개까지 windowMs 창 안에서 허용, 초과 시 false.
export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  prune(now);

  const recent = (buckets.get(key)?.times ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit) {
    buckets.set(key, { times: recent, windowMs });
    return false;
  }
  recent.push(now);
  buckets.set(key, { times: recent, windowMs });
  return true;
}

// 테스트 전용: 지금 들고 있는 키 개수. 누수 회귀를 값으로 확인하기 위한 창구다
// (내부 Map을 그대로 내보내면 밖에서 고칠 수 있게 되므로 개수만 준다).
export function bucketCount(): number {
  return buckets.size;
}
