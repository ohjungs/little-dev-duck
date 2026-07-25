// 주간 다이제스트(Phase 18 T4) 생성 이력. 주차 키만 저장한다 — 같은 주에 두 번 만들지 않기 위한 것이라
// 서버 테이블이 필요 없다(ponytail). 판정 자체는 core shouldCreateDigest(테스트됨)가 한다.

const KEY = "ldd:weeklyDigest";

// 저장 실패·오염에도 앱이 죽지 않아야 한다. 못 읽으면 "만든 적 없음"으로 보고 core가 판정한다.
export function readLastDigestWeek(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeLastDigestWeek(weekKey: string): void {
  try {
    window.localStorage.setItem(KEY, weekKey);
  } catch {
    // 저장 실패 = 다음 방문에 한 번 더 시도. 중복 페이지 1개가 앱이 깨지는 것보다 낫다.
  }
}

// 다이제스트 본문 줄 → BlockNote 블록. 첫 줄은 인사, "지난 주 요약"·"이번 주 계획"은 소제목,
// 빈 줄은 사용자가 이어 쓸 자리. 나머지는 불릿.
const HEADINGS = new Set(["지난 주 요약", "이번 주 계획"]);

export function digestLinesToBlocks(lines: string[]): unknown[] {
  return lines.map((line, i) => {
    if (line === "") return { type: "paragraph" };
    const content = [{ type: "text", text: line, styles: {} }];
    if (HEADINGS.has(line)) {
      return { type: "heading", props: { level: 2 }, content };
    }
    if (i === 0) return { type: "paragraph", content };
    return { type: "bulletListItem", content };
  });
}
