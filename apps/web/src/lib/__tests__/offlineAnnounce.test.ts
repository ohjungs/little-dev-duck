import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "../stripComments";

// 2026-07-30 : 접근성 - 오프라인 배너 - 라이브 리전
//
// 인터넷이 끊기면 화면 위에 붉은 띠가 뜬다. 그런데 그건 **눈으로만** 보였다 — 라이브 리전이
// 없어 스크린리더 사용자는 연결이 끊긴 사실을 듣지 못했다. 오프라인은 이후 저장이 실패하기
// 시작한다는 뜻이라, "지금 상태가 바뀌었다"를 알려야 하는 대표적인 경우다.
//
// `role="alert"`(assertive)가 아니라 `role="status"`(polite)를 쓴다: 배너는 오프라인인 동안
// 계속 떠 있으므로 공손한 알림도 놓치지 않고, 연결이 불안정해 온·오프가 반복될 때 읽던 문장을
// 매번 끊는 편이 더 나쁘다. (`role="status"`가 이미 aria-live=polite를 함의하므로 중복 표기는
// 하지 않는다.)

const SRC = stripComments(
  readFileSync(
    join(process.cwd(), "src", "components", "OfflineIndicator.tsx"),
    "utf8",
  ),
);

describe("오프라인 배너 알림", () => {
  it("검사가 실제로 파일을 읽었다", () => {
    expect(SRC).toContain("OfflineIndicator");
    expect(SRC).toContain("오프라인");
  });

  it("보조기술에 상태 변화를 알린다", () => {
    expect(SRC).toMatch(/role="status"/);
  });

  it("연결이 오갈 때 읽던 문장을 끊지 않는다 (assertive 금지)", () => {
    // role="alert"·aria-live="assertive"는 읽고 있던 내용을 가로챈다 — 연결이 불안정하면
    // 그때마다 끊긴다. 배너가 계속 떠 있으니 polite로 충분하다.
    expect(SRC).not.toMatch(/role="alert"/);
    expect(SRC).not.toMatch(/aria-live="assertive"/);
  });
});
