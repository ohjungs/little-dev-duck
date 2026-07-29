import { describe, expect, it } from "vitest";
import { buildLabel } from "../buildInfo";

// 2026-07-29 : 설정 - 버전 정보 (Phase 56 T2 T-023)
// 하드코딩 "v1.0.0"은 어떤 배포와도 무관한 낡은 표기였다 — 실제 배포 커밋을 보여준다.
describe("buildLabel", () => {
  it("커밋 해시가 있으면 7자로 줄여 배포 표기", () => {
    expect(buildLabel("1931d2b8aabbccddeeff00112233445566778899")).toBe("배포 1931d2b");
  });

  it("해시가 없으면(로컬 개발) 개발 빌드", () => {
    expect(buildLabel(undefined)).toBe("개발 빌드");
    expect(buildLabel("")).toBe("개발 빌드");
  });

  it("해시 형식이 아니면 아는 척하지 않고 개발 빌드", () => {
    expect(buildLabel("not-a-sha!")).toBe("개발 빌드");
    expect(buildLabel("abc")).toBe("개발 빌드");
  });
});
