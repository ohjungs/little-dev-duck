import {
  collectLocalPrefs,
  planLocalPrefsRestore,
  type LocalPrefs,
} from "@ldd/core";

// 2026-07-26 : 백업 - 브라우저 로컬 설정 - 저장소 접근
// 판단(무엇을 담고 무엇을 쓸지)은 core가 순수하게 한다. 여기는 localStorage에 닿는 얇은 층이다 —
// 그래서 core 테스트가 브라우저 없이 전부 돌고, 이 파일에는 검사할 판단이 남지 않는다.
//
// **서버에서도 안전하게 불린다.** 내보내기 조립(collectBackup)은 node 환경 테스트에서도 도는데,
// 거기엔 window가 없다. 없으면 "설정 없음"으로 떨어진다(빈 객체) — 실패가 아니다.

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function readLocalPrefs(): LocalPrefs {
  return collectLocalPrefs(readKey);
}

// 실제로 쓴 개수를 돌려준다. **이미 있는 키는 건드리지 않는다**(core가 판정) —
// 가져오기의 "지금 데이터를 바꾸지 않는다" 계약 그대로다.
export function restoreLocalPrefs(prefs: LocalPrefs): number {
  if (typeof window === "undefined") return 0;
  let written = 0;
  for (const { key, value } of planLocalPrefsRestore(prefs, readKey)) {
    try {
      window.localStorage.setItem(key, value);
      written += 1;
    } catch {
      // 저장소가 가득 찼거나 막힌 브라우저다. 설정 하나 때문에 나머지 복원을 멈추지 않는다.
    }
  }
  return written;
}
