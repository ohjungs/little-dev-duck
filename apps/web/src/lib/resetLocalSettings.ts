// 2026-07-29 : 설정 - 초기화 (Phase 56 T2 T-031)
// 이 기기의 브라우저 저장값을 초기화한다. **DB는 건드리지 않는다** — 계정·대화·문서는 그대로다.
// 이 앱의 localStorage 키는 전부 "ldd" 접두어("ldd-"·"ldd:")라 접두어 규칙으로 지운다 —
// 키 목록을 손으로 유지하면 새 키가 생길 때마다 어긋난다(누락된 키는 초기화가 안 된 채 남는다).
// 다른 앱·인증 토큰(supabase.*) 키는 후보에도 올리지 않는다.

type EnumerableStorage = Pick<Storage, "length" | "key" | "removeItem">;

function defaultStorage(): EnumerableStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function listLddKeys(
  storage: EnumerableStorage | null = defaultStorage(),
): string[] {
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null && k.startsWith("ldd")) keys.push(k);
  }
  return keys;
}

/** ldd 키를 전부 지우고 지운 개수를 돌려준다. 열거를 먼저 끝낸 뒤 지운다(지우면서 돌면 인덱스가 밀린다). */
export function resetLocalSettings(
  storage: EnumerableStorage | null = defaultStorage(),
): number {
  const keys = listLddKeys(storage);
  for (const k of keys) {
    try {
      storage?.removeItem(k);
    } catch {
      // 한 키가 막혀도 나머지는 지운다.
    }
  }
  return keys.length;
}
