import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  passwordUpdateErrorMessage,
  AUTH_GENERIC_CREDENTIAL_MESSAGE,
  PASSWORD_RESET_LINK_EXPIRED_MESSAGE,
} from "./auth-error";

// 2026-07-26 : 인증 - 오류문구 - 열거방지 (Phase 41 T1·T2)
// 이 파일이 지키는 가장 중요한 성질은 **계정 열거(account enumeration) 차단**이다.
// "없는 계정"과 "틀린 비밀번호"를 구분해 알려주면, 그건 곧 **어느 이메일이 가입돼 있는지
// 확인해 주는 통로**가 된다(비밀번호를 모르는 사람도 가입 여부는 알아낼 수 있다).
//
// web `friendlyError`를 쓰지 않는 이유: 그건 **모르는 오류의 원문을 그대로 보여준다**.
// DB 오류에는 그게 맞지만 인증에서는 영문 원문이 노출되고 열거 방지도 깨진다.

describe("인증 오류 문구", () => {
  it("자격증명 실패는 원인을 구분하지 않는다 (계정 열거 차단)", () => {
    // Supabase는 둘 다 같은 문자열을 주지만, 문자열이 바뀌어도 우리 문구는 하나여야 한다.
    for (const raw of [
      "Invalid login credentials",
      "invalid_credentials",
      "Invalid email or password",
    ]) {
      expect(authErrorMessage(raw)).toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE);
    }
  });

  it("이미 가입된 이메일이라는 사실을 알려주지 않는다", () => {
    // 가입 실패를 "이미 있는 계정"으로 알려주면 로그인 쪽 열거 방지가 무의미해진다.
    const msg = authErrorMessage("User already registered");
    expect(msg).toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE);
    expect(msg).not.toContain("이미");
    expect(msg).not.toContain("가입");
  });

  it("메일 확인 대기는 알려준다 (열거가 아니라 본인 상태다)", () => {
    // 이건 본인이 방금 가입한 흐름에서만 나오므로 남의 계정 정보가 아니다.
    // 안 알려주면 사용자는 왜 로그인이 안 되는지 영원히 모른다.
    const msg = authErrorMessage("Email not confirmed");
    expect(msg).toContain("메일");
    expect(msg).not.toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE);
  });

  it("이메일 로그인이 꺼져 있으면 그 사실과 대안을 말한다", () => {
    // Supabase 대시보드에서 Email provider를 켜기 전 상태. 정체 모를 실패로 두면
    // 사용자는 자기 비밀번호를 의심한다(이 저장소가 Phase 37에서 고친 부류).
    const msg = authErrorMessage("Email logins are disabled");
    expect(msg).toContain("이메일 로그인");
    expect(msg).toMatch(/Google|GitHub/);
  });

  it("시도 상한은 기다리라고 말한다", () => {
    const msg = authErrorMessage("Email rate limit exceeded");
    expect(msg).toContain("잠시");
  });

  it("약한 비밀번호는 기준을 말한다", () => {
    const msg = authErrorMessage("Password should be at least 6 characters");
    expect(msg).toContain("비밀번호");
    expect(msg).not.toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE);
  });

  it("모르는 오류는 영문 원문을 노출하지 않는다", () => {
    // friendlyError와 정반대 방침이다. 인증 실패 화면에 영문 스택이 뜨면
    // 사용자는 무엇을 해야 할지 모르고, 원문에 내부 정보가 섞일 수 있다.
    const msg = authErrorMessage("PGRST999 something internal exploded");
    expect(msg).not.toContain("PGRST999");
    expect(msg).not.toContain("exploded");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("빈 입력·null도 문구를 돌려준다 (빈 화면 금지)", () => {
    for (const raw of ["", "   ", null, undefined]) {
      expect(authErrorMessage(raw).trim().length).toBeGreaterThan(0);
    }
  });

  it("대소문자·공백에 흔들리지 않는다", () => {
    expect(authErrorMessage("  INVALID LOGIN CREDENTIALS  ")).toBe(
      AUTH_GENERIC_CREDENTIAL_MESSAGE,
    );
  });

  it("모든 문구가 한국어이고 영문 오류 코드를 담지 않는다", () => {
    const raws = [
      "Invalid login credentials",
      "Email not confirmed",
      "Email logins are disabled",
      "Email rate limit exceeded",
      "Password should be at least 6 characters",
      "unknown weirdness",
    ];
    for (const raw of raws) {
      const msg = authErrorMessage(raw);
      expect(msg).toMatch(/[가-힣]/);
      // 원문 토큰이 그대로 새어 나오지 않는지 본다(Google·GitHub은 의도된 고유명사라 제외).
      expect(msg).not.toMatch(/[a-z]{4,}_[a-z]{4,}/);
    }
  });
});

// 2026-07-26 : 인증 - 오류문구 - 재설정 (Phase 41 T3)
// 재설정이 없으면 비밀번호를 잊은 사용자는 **영구 잠긴다**(OAuth 사용자에겐 없던 상태다).
// 이 표가 지키는 것은 "왜 안 되는지"다 — 만료된 링크를 자격증명 실패로 뭉뚱그리면
// 사용자는 자기 비밀번호를 의심하며 같은 죽은 링크를 계속 누른다.
describe("비밀번호 재설정 오류 문구", () => {
  it("만료·1회용 링크는 다시 요청하라고 말한다", () => {
    for (const raw of [
      "Email link is invalid or has expired",
      "otp_expired",
      "Token has expired or is invalid",
      "AuthSessionMissingError: Auth session missing!",
      "flow_state_not_found",
    ]) {
      expect(passwordUpdateErrorMessage(raw)).toBe(
        PASSWORD_RESET_LINK_EXPIRED_MESSAGE,
      );
    }
  });

  it("만료 판정을 로그인 쪽에 흘리지 않는다", () => {
    // 로그인 실패에도 "expired"·"session missing"이 나올 수 있다. 그때 "재설정 링크가
    // 만료됐습니다"라고 하면 거짓말이고, 사용자는 엉뚱한 곳을 고치려 한다.
    expect(authErrorMessage("Auth session missing!")).not.toBe(
      PASSWORD_RESET_LINK_EXPIRED_MESSAGE,
    );
  });

  it("같은 비밀번호로는 못 바꾼다는 사실을 말한다", () => {
    const msg = passwordUpdateErrorMessage(
      "New password should be different from the old password.",
    );
    expect(msg).toContain("다른 비밀번호");
    expect(msg).not.toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE);
  });

  it("약한 비밀번호·시도 상한은 로그인과 같은 문구를 쓴다 (두 벌 금지)", () => {
    for (const raw of [
      "Password should be at least 6 characters",
      "Email rate limit exceeded",
    ]) {
      expect(passwordUpdateErrorMessage(raw)).toBe(authErrorMessage(raw));
    }
  });

  it("모르는 오류의 폴백이 '로그인 실패'가 아니다", () => {
    // 방금 메일 링크를 눌러 들어온 사용자에게 "로그인에 실패했습니다"라고 하면
    // 무엇을 다시 해야 하는지 알 수 없다.
    const msg = passwordUpdateErrorMessage("PGRST999 something internal");
    expect(msg).toContain("비밀번호");
    expect(msg).not.toContain("로그인");
    expect(msg).not.toContain("PGRST999");
  });

  it("빈 입력·null도 문구를 돌려준다 (빈 화면 금지)", () => {
    for (const raw of ["", "   ", null, undefined]) {
      const msg = passwordUpdateErrorMessage(raw);
      expect(msg.trim().length).toBeGreaterThan(0);
      expect(msg).toMatch(/[가-힣]/);
    }
  });

  it("모든 문구가 한국어이고 영문 오류 코드를 담지 않는다", () => {
    for (const raw of [
      "Email link is invalid or has expired",
      "same_password",
      "otp_expired",
      "unknown weirdness",
    ]) {
      const msg = passwordUpdateErrorMessage(raw);
      expect(msg).toMatch(/[가-힣]/);
      expect(msg).not.toMatch(/[a-z]{4,}_[a-z]{4,}/);
    }
  });
});
