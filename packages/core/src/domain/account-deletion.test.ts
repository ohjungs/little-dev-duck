import { describe, it, expect } from "vitest";
import {
  ACCOUNT_DELETE_STEPS,
  ACCOUNT_DELETE_PHRASE,
  CONTENT_DELETE_PHRASE,
  accountDeletionEnabled,
} from "./account-deletion";

// 2026-07-26 : 계정 - 파기 - 계약 (Phase 35 T1)
// 되돌릴 수 없는 기능이라 **말로 적어 둔 규칙은 다음 사람이 어긴다.** 계약을 값으로 두고 잠근다.

describe("accountDeletionEnabled — 미설정이 안전한 기본값", () => {
  it("키가 없으면 꺼져 있다", () => {
    expect(accountDeletionEnabled(undefined)).toBe(false);
  });

  it("빈 문자열·공백만 있어도 꺼져 있다", () => {
    // 환경변수를 만들어만 두고 값을 안 넣는 실수가 흔하다. 그때 켜진 것으로 보면 안 된다.
    expect(accountDeletionEnabled("")).toBe(false);
    expect(accountDeletionEnabled("   ")).toBe(false);
  });

  it("값이 있으면 켜진다", () => {
    expect(accountDeletionEnabled("some-service-role-key")).toBe(true);
  });
});

describe("ACCOUNT_DELETE_STEPS — 순서가 계약이다", () => {
  it("콘텐츠를 먼저 지우고 계정을 마지막에 지운다", () => {
    // 뒤집히면 계정이 먼저 사라져 세션이 죽고, 콘텐츠 삭제가 중간에 멈춘다.
    // 사용자는 **지워졌다고 믿는 남은 데이터**를 갖게 된다.
    expect(ACCOUNT_DELETE_STEPS).toEqual(["content", "account"]);
  });

  it("계정 삭제가 마지막 단계다", () => {
    expect(ACCOUNT_DELETE_STEPS[ACCOUNT_DELETE_STEPS.length - 1]).toBe("account");
  });
});

describe("확인 문구 — 두 삭제가 서로 다른 문구를 쓴다", () => {
  it("콘텐츠 삭제와 계정 삭제의 문구가 다르다", () => {
    // 같으면 손이 기억한 대로 눌러 **계정까지** 지운다. 되돌릴 수 없는 쪽이라 더 위험하다.
    expect(ACCOUNT_DELETE_PHRASE).not.toBe(CONTENT_DELETE_PHRASE);
  });

  it("두 문구 모두 비어 있지 않다", () => {
    // 빈 문구면 확인 게이트가 사실상 없는 것이 된다.
    expect(CONTENT_DELETE_PHRASE.trim().length).toBeGreaterThan(0);
    expect(ACCOUNT_DELETE_PHRASE.trim().length).toBeGreaterThan(0);
  });

  it("한쪽이 다른 쪽의 앞부분이 아니다", () => {
    // "삭제합니다"와 "삭제합니다 계정"처럼 겹치면 잘못 입력해도 통과하는 구간이 생긴다.
    expect(ACCOUNT_DELETE_PHRASE.startsWith(CONTENT_DELETE_PHRASE)).toBe(false);
    expect(CONTENT_DELETE_PHRASE.startsWith(ACCOUNT_DELETE_PHRASE)).toBe(false);
  });
});

describe("accountDeletionEnabled — 타입 가드", () => {
  it("좁혀진 값을 캐스트 없이 string으로 쓸 수 있다", () => {
    // 가드가 아니면 호출부가 `key as string`을 써야 하고, 그 캐스트는 나중에 검사를 옮기거나
    // 지웠을 때 **undefined가 조용히 통과**하는 자리가 된다.
    // 이 테스트는 컴파일이 곧 검증이다 — 가드를 boolean으로 되돌리면 타입체크에서 먼저 깨진다.
    // core는 node 타입을 쓰지 않으므로(process 없음) 환경변수와 같은 모양의 값으로 대신한다.
    const cases: (string | undefined)[] = [undefined, "  ", "real-key"];
    const narrowedValues: string[] = [];
    for (const key of cases) {
      if (accountDeletionEnabled(key)) {
        // 가드가 아니면 이 대입이 타입체크에서 깨진다.
        const narrowed: string = key;
        narrowedValues.push(narrowed);
      }
    }
    expect(narrowedValues).toEqual(["real-key"]);
  });
});
