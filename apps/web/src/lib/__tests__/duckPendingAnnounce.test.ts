import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-30 : 접근성 - 오리 응답 대기 알림 - 단일 출처 (감사 발견)
//
// 오리에게 물으면 답이 오기까지 몇 초가 걸린다. 메신저 오리 방은 `role="status"`로
// "오리가 생각하는 중…"을 알려 주는데, **대시보드 오리 패널은 점 3개 애니메이션만** 있고
// 텍스트도 라이브 리전도 없었다 — 스크린리더 사용자는 보냈는데 아무 반응이 없는 것처럼
// 느낀다(오리 대화는 이 제품의 핵심 기능이다).
//
// 문구를 두 곳에 복사하면 한쪽만 고쳐진다(이 저장소 L-21의 실패 모양). 그래서 문구는
// `DUCK_PENDING_LABEL` 한 벌로 두고, 두 화면이 그것을 쓰는지 정적으로 잠근다.

const read = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

// 오리 응답 대기를 표시하는 화면 전부. 새 화면이 생기면 여기 추가한다.
const DUCK_SURFACES = [
  "src/components/DuckChatPanel.tsx",
  "src/components/MessageRoom.tsx",
];

describe("오리 응답 대기 알림", () => {
  it("문구는 lib 한 곳에만 리터럴로 있다", () => {
    const source = read("src/lib/duckPending.ts");
    expect(source).toContain("오리가 생각하는 중");

    for (const f of DUCK_SURFACES) {
      const src = read(f);
      // 화면이 문구를 직접 박으면 다음 수정 때 한쪽만 바뀐다.
      expect(src, `${f}가 문구를 직접 박고 있다`).not.toContain("오리가 생각하는 중");
      expect(src, `${f}가 공용 라벨을 쓰지 않는다`).toContain("DUCK_PENDING_LABEL");
    }
  });

  it("두 화면 모두 보조기술에 대기 상태를 알린다", () => {
    // 점 애니메이션만 있으면 눈으로만 보인다 — 라이브 리전이 있어야 읽힌다.
    for (const f of DUCK_SURFACES) {
      expect(read(f), `${f}에 role="status"가 없다`).toContain('role="status"');
    }
  });
});
