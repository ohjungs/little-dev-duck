import { describe, it, expect } from "vitest";
import { pendingMigrationMessage } from "./pending-migration";

// 2026-07-26 : 오류 - 미적용마이그레이션 - 사람말로 (Phase 37)
// lessons-learned "미적용 마이그레이션의 컬럼을 payload에 실으면 쓰기가 죽는다"의 후속.
// 그 교훈은 **payload 쪽**을 고쳤는데, **사용자가 무엇을 보는가**는 그대로였다 —
// 대시보드 카드 순서를 바꾸면 되돌아가면서 영문 DB 오류가 뜬다.

describe("pendingMigrationMessage — 컬럼이 없다는 오류를 알아본다", () => {
  it("PostgREST의 컬럼 없음 오류를 알아본다", () => {
    const raw =
      "Could not find the 'dashboard_layout' column of 'profiles' in the schema cache";
    expect(pendingMigrationMessage(raw)).not.toBeNull();
  });

  it("Postgres의 컬럼 없음 오류도 알아본다", () => {
    expect(
      pendingMigrationMessage('column "dashboard_layout" does not exist'),
    ).not.toBeNull();
  });

  it("PGRST204 코드가 실린 문구도 알아본다", () => {
    expect(pendingMigrationMessage("PGRST204: schema cache miss")).not.toBeNull();
  });

  it("대소문자가 달라도 알아본다", () => {
    expect(
      pendingMigrationMessage("COULD NOT FIND THE 'x' COLUMN OF 'y'"),
    ).not.toBeNull();
  });
});

describe("pendingMigrationMessage — 아닌 것은 아니라고 한다", () => {
  it("평범한 오류는 null이다", () => {
    // 여기서 과하게 잡으면 **진짜 원인을 가린다.** 모르는 오류는 원문을 보여주는 게 낫다.
    for (const raw of [
      "네트워크 연결이 끊겼습니다",
      "new row violates row-level security policy",
      "duplicate key value violates unique constraint",
      "permission denied for table profiles",
    ]) {
      expect(pendingMigrationMessage(raw), raw).toBeNull();
    }
  });

  it("빈 문자열·공백은 null이다", () => {
    expect(pendingMigrationMessage("")).toBeNull();
    expect(pendingMigrationMessage("   ")).toBeNull();
  });

  it("'column'이라는 단어만으로는 잡지 않는다", () => {
    // "이 열은 필수입니다" 같은 문구를 마이그레이션 문제로 오인하면 안 된다.
    expect(pendingMigrationMessage("column value is required")).toBeNull();
  });
});

describe("pendingMigrationMessage — 무엇을 하라고 알려준다", () => {
  const msg = pendingMigrationMessage(
    "Could not find the 'dashboard_layout' column of 'profiles' in the schema cache",
  );

  it("한국어로 말한다", () => {
    expect(msg).toMatch(/[가-힣]/);
  });

  it("사용자 잘못이 아니라는 걸 알린다", () => {
    // 되돌아가는 화면만 보면 자기가 뭘 잘못했는지 의심하게 된다.
    expect(msg).toContain("아직");
  });

  it("영문 원문을 그대로 노출하지 않는다", () => {
    expect(msg).not.toContain("schema cache");
    expect(msg).not.toContain("Could not find");
  });
});
