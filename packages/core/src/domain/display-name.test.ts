import { describe, expect, it } from "vitest";
import { resolveDisplayName, DISPLAY_NAME_FALLBACK } from "./display-name";

// 2026-07-27 : 프로필 - 표시이름 - 한 벌 (Phase 42 T4)
// 이 함수가 있는 이유는 **계산이 두 벌이었기 때문**이다. 사이드바는 프로필 이름을 읽는데
// 대시보드 인사말은 안 읽어서, 사용자가 프로필에서 이름을 바꾸면 **왼쪽은 바뀌고 인사말은
// 안 바뀌었다.** 사용자가 정확히 그걸 보고 피드백을 남겼다(2차 1-2).
//
// 두 벌이면 한쪽만 고쳐진다 — 그게 애초에 이 결함이 난 이유다. 그래서 한 곳에 모은다.

describe("표시 이름 결정", () => {
  it("프로필에서 바꾼 이름이 가장 먼저다", () => {
    // OAuth가 준 이름은 사용자가 고칠 수 없다. 고친 값이 있으면 그게 사용자의 의사다.
    expect(
      resolveDisplayName({
        profileName: "오리주인",
        metadataFullName: "Google Name",
      }),
    ).toBe("오리주인");
  });

  it("프로필 이름이 없으면 OAuth 이름으로 내려간다", () => {
    expect(
      resolveDisplayName({ profileName: null, metadataFullName: "Full Name" }),
    ).toBe("Full Name");
    // full_name이 없는 provider도 있다(GitHub은 name만 주는 경우가 있다).
    expect(resolveDisplayName({ metadataName: "Just Name" })).toBe("Just Name");
    expect(
      resolveDisplayName({ metadataFullName: "Full", metadataName: "Name" }),
    ).toBe("Full");
  });

  it("아무 이름도 없으면 이메일이 아니라 기본 호칭이다", () => {
    // 2026-07-27 판단: 이메일을 표시 이름으로 쓰면 사이드바에서 **이메일이 두 줄로 겹쳐 뜬다**
    // (AppNav가 이름 바로 아래에 이메일을 따로 그린다). 인사말도 "안녕하세요, a@b.com님"이 된다.
    // 화면 공유 시 주소가 그대로 노출되는 것도 덤이다. 되돌리기 쉬운 문구라 진행하고 기록했다.
    //
    // **함수가 이메일을 아예 받지 않는다** — 인자에 없으면 실수로도 새어 나갈 수 없다.
    // 아래가 타입 오류 없이 컴파일된다는 사실 자체가 그 계약이다.
    expect(resolveDisplayName({})).toBe(DISPLAY_NAME_FALLBACK);
    expect(resolveDisplayName({ profileName: null })).toBe(
      DISPLAY_NAME_FALLBACK,
    );
  });

  it("빈 문자열·공백만 있는 이름은 없는 것으로 본다", () => {
    // 프로필을 지우면 빈 문자열이 남을 수 있고, 그때 "안녕하세요, 님"이 뜬다.
    for (const blank of ["", "   ", "\t\n"]) {
      expect(
        resolveDisplayName({ profileName: blank, metadataFullName: "쓸 이름" }),
      ).toBe("쓸 이름");
    }
    expect(resolveDisplayName({ profileName: "  " })).toBe(
      DISPLAY_NAME_FALLBACK,
    );
  });

  it("앞뒤 공백을 다듬는다", () => {
    expect(resolveDisplayName({ profileName: "  오리  " })).toBe("오리");
  });

  it("문자열이 아닌 메타데이터는 무시한다", () => {
    // user_metadata는 임의 JSON이고 **사용자가 스스로 덮어쓸 수 있다**(이 저장소가
    // github contributions 라우트 주석에 적어 둔 사실). 숫자·객체가 들어와도 화면이
    // "[object Object]"가 되면 안 된다.
    for (const junk of [42, {}, [], true, null, undefined]) {
      expect(
        resolveDisplayName({ metadataFullName: junk, metadataName: "안전한 이름" }),
      ).toBe("안전한 이름");
    }
  });

  it("지나치게 긴 이름은 잘라 낸다 (레이아웃 보호)", () => {
    // 프로필 경로는 profileSchema가 50자로 막지만, **OAuth 메타데이터는 아무도 안 막는다.**
    // 인사말은 truncate가 없어서 긴 이름이 그대로 한 줄을 밀어낸다.
    const long = "가".repeat(300);
    const out = resolveDisplayName({ metadataFullName: long });
    expect(out.length).toBeLessThanOrEqual(50); // profileSchema의 상한과 같은 값
    expect(out.startsWith("가")).toBe(true);
  });

  it("한글·이모지가 깨지지 않는다", () => {
    expect(resolveDisplayName({ profileName: "김오리🦆" })).toBe("김오리🦆");
    // 자르기가 코드 포인트 중간을 끊어 깨진 글자를 만들지 않는지 본다.
    const emojis = "🦆".repeat(100);
    const out = resolveDisplayName({ profileName: emojis });
    expect(out).toBe(out.normalize());
    expect([...out].every((ch) => ch === "🦆")).toBe(true);
  });

  it("어떤 입력에도 빈 문자열을 돌려주지 않는다", () => {
    // 빈 값이면 화면에 "안녕하세요, 님"이 뜬다.
    for (const input of [
      {},
      { profileName: null },
      { profileName: "   ", metadataFullName: "  ", metadataName: "  " },
    ]) {
      expect(resolveDisplayName(input).length).toBeGreaterThan(0);
    }
  });
});
