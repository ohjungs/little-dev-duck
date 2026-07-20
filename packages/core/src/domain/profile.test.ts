import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile";

const validProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "duck@example.com",
  displayName: "오리",
  avatarUrl: null,
  createdAt: "2026-07-20T00:00:00.000Z",
};

describe("profileSchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("빈 표시 이름을 거부한다", () => {
    expect(
      profileSchema.safeParse({ ...validProfile, displayName: "" }).success,
    ).toBe(false);
  });

  it("잘못된 형식의 이메일을 거부한다", () => {
    expect(
      profileSchema.safeParse({ ...validProfile, email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      profileSchema.safeParse({ ...validProfile, createdAt: "invalid" })
        .success,
    ).toBe(false);
  });
});
