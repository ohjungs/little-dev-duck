import { describe, expect, it } from "vitest";
import { detectSensitiveInfo } from "./sensitive-info";

// 2026-07-29 : 보안 - 민감 정보 자동 감지 (Phase 58 T5 U-016)
// 판정은 결정적 — 정규식(HD-003). **좁게만 잡는다**(Phase 37의 판단): 과하게 잡으면
// 정상 메시지에 경고가 붙어 경고 자체가 무시된다. 경고만 하고 막지 않는 건 호출부 몫.
describe("detectSensitiveInfo", () => {
  it("주민등록번호 모양을 잡는다", () => {
    expect(detectSensitiveInfo("내 번호는 900101-1234567 이야")).toContain(
      "주민등록번호로 보이는 숫자",
    );
  });

  it("카드번호 모양(4-4-4-4)을 잡는다", () => {
    expect(detectSensitiveInfo("카드 1234-5678-9012-3456 으로 결제")).toContain(
      "카드번호로 보이는 숫자",
    );
    expect(detectSensitiveInfo("1234 5678 9012 3456")).toContain("카드번호로 보이는 숫자");
  });

  it("흔한 API 키 접두사를 잡는다", () => {
    expect(detectSensitiveInfo("sk-abcdefghijklmnopqrstuvwx")).toContain("API 키로 보이는 문자열");
    expect(detectSensitiveInfo("ghp_" + "a".repeat(36))).toContain("API 키로 보이는 문자열");
    expect(detectSensitiveInfo("AKIA" + "A".repeat(16))).toContain("API 키로 보이는 문자열");
  });

  it("긴 JWT 모양을 잡는다", () => {
    const jwt = "eyJ" + "a".repeat(40) + "." + "b".repeat(40) + "." + "c".repeat(40);
    expect(detectSensitiveInfo(`토큰: ${jwt}`)).toContain("토큰(JWT)으로 보이는 문자열");
  });

  it("정상 문장은 잡지 않는다 — 전화번호·날짜·짧은 숫자 오탐 금지", () => {
    for (const ok of [
      "010-1234-5678로 전화해",           // 전화번호(3-4-4)는 주민·카드 패턴이 아니다
      "2026-07-29 회의",                  // 날짜
      "가격은 123456원",                  // 짧은 숫자
      "skill 얘기야",                     // sk- 접두사 오탐 방지(하이픈 필요)
      "eyJ 시작하는 게 JWT랬어",           // 짧은 eyJ 언급
      "평범한 한국어 문장입니다",
    ]) {
      expect(detectSensitiveInfo(ok), ok).toEqual([]);
    }
  });

  it("여러 종류가 섞이면 전부, 같은 종류는 한 번만", () => {
    const hits = detectSensitiveInfo(
      "900101-1234567 그리고 850505-2345678, 카드 1111-2222-3333-4444",
    );
    expect(hits).toEqual(["주민등록번호로 보이는 숫자", "카드번호로 보이는 숫자"]);
  });

  it("빈 문자열은 빈 목록", () => {
    expect(detectSensitiveInfo("")).toEqual([]);
  });
});
