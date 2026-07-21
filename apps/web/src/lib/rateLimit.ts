// 인메모리 per-key 슬라이딩 윈도우 레이트리밋. 서버리스 인스턴스별 카운터라 완벽하진 않지만,
// 솔로 v1에서 Gemini 무료 쿼터를 폭주 요청으로부터 지키는 1차 방어로 충분하다.
// ponytail: 인스턴스별 근사. 멀티 인스턴스 정확성이 필요하면 Upstash/Redis로 교체.
const buckets = new Map<string, number[]>();

export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
