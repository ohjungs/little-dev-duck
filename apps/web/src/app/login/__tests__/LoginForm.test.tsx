// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  AUTH_GENERIC_CREDENTIAL_MESSAGE,
  authErrorMessage,
  passwordUpdateErrorMessage,
} from "@ldd/core";

// 2026-07-31 : 테스트 - 이메일로그인 - 렌더층계약 (Phase 41 T1~T3)
// 이 파일이 지키는 계층은 **렌더**다. 계층 소유권(중복 단언 금지):
//   - 오류 원문 → 한국어 문구 매핑 ......... 여기(S·U·R)
//   - 상한 인자·키 정규화 .................. 여기(L2)
//   - busy 재진입 차단 ..................... 여기(B1)
//   - HTML5 required 차단 .................. e2e (email-login.spec.ts)
//   - 성공 시 서버가 세션을 다시 읽는 실이동 . e2e
// 문구 정책: core가 export하는 문구는 **import 비교**만 한다(리터럴 하드코딩 금지).
// 컴포넌트 로컬 문구(상한 안내·"먼저 이메일을…"·가입/재설정 안내)는 export가 없어
// **역할(role) 존재 + 라틴문자 미포함**으로 단언한다 — 문구를 다듬어도 안 깨지고,
// 영문 원문이 새면 깨진다(그게 이 계약이 지키려는 것이다).

// 2026-07-31 : 테스트 - 환경한계 - window.location스텁방법
// `vi.spyOn(window.location, "assign")`은 이 환경에서 **불가능**하다(실측: jsdom 29 +
// vitest 4에서 `TypeError: Cannot redefine property: assign`). Location 인스턴스의
// 속성이 non-configurable이기 때문이다.
// 대신 **window 자신의 own property인 `location`을 통째로 교체**한다 — 이건 실측으로
// 통과했다(프로브 1회). 프로토타입 패치가 아니라 이 jsdom window 한 개의 own property라
// 다른 파일·다른 테스트로 새지 않고, 아래 afterAll에서 원 디스크립터로 되돌린다.
// origin까지 스텁이 들고 있어야 한다 — 컴포넌트가 redirectTo를 만들 때 읽는다.
const ORIGIN = window.location.origin;
const ORIGINAL_LOCATION = Object.getOwnPropertyDescriptor(window, "location");

let assign = vi.fn<(url: string) => void>();

// @ldd/api는 **부분 더블**이다(전면 mock 금지). allowRequest만 스파이로 감싸고
// 구현은 실물 그대로 쓴다 — 그래야 L2(인자)와 L3(6번째 차단)를 한 파일에서 함께 잠근다.
const rate = vi.hoisted(() => ({
  allowRequest: vi.fn<(key: string, limit: number, windowMs: number) => boolean>(),
}));
vi.mock("@ldd/api", async () => {
  const actual = await vi.importActual<typeof import("@ldd/api")>("@ldd/api");
  rate.allowRequest.mockImplementation(actual.allowRequest);
  return { ...actual, allowRequest: rate.allowRequest };
});

// 2026-07-31 : 테스트 - 픽스처 - DuckVideo대역
// mock 없이 먼저 돌려 본 결과 **실제로 터졌다**(실측): `window.matchMedia is not a function`.
// DuckVideo → @ldd/mascot usePrefersReducedMotion이 matchMedia를 부르는데 jsdom엔 없다.
// 로그인 폼 계약과 무관한 실패라 대역으로 세운다. 영상 자체의 재생 정책은 별도 관심사다.
vi.mock("@/components/DuckVideo", () => ({ DuckVideo: () => null }));

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth }),
}));

const { LoginForm } = await import("../LoginForm");

// 2026-07-31 : 테스트 - 격리 - 상한버킷은모듈전역
// packages/api/src/rateLimit.ts에는 리셋 export가 없다(bucketCount만). 버킷은 모듈 전역이라
// 앞 테스트가 남긴 카운트가 뒤 테스트로 샌다. **테스트마다 다른 이메일 상수**가 격리 수단이다.
// 같은 값을 두 곳에서 쓰면 조용히 5회를 나눠 쓰게 되므로 여기 한 곳에 모아 둔다.
const EMAIL = {
  signinOk: "s1-ok@example.com",
  signinFail: "s2-fail@example.com",
  signinRaw: "S5-Mixed@Example.COM",
  signupOk: "u1-session@example.com",
  signupFail: "u2-fail@example.com",
  signupNotice: "u3-notice@example.com",
  signupArgs: "u4-args@example.com",
  resetOk: "r2-ok@example.com",
  resetFail: "r3-fail@example.com",
  limit: "l3-limit@example.com",
  busy: "b1-busy@example.com",
  switchTab: "x1-switch@example.com",
} as const;

const PASSWORD = "correct-horse-battery-staple";
const LATIN = /[A-Za-z]/;

function fill(email: string, password: string = PASSWORD): void {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: password },
  });
}

function submit(): void {
  fireEvent.click(
    screen.getByRole("button", { name: /^이메일로 (로그인|가입)$/ }),
  );
}

function alertText(): string {
  return screen.getByRole("alert").textContent ?? "";
}

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { origin: ORIGIN, href: `${ORIGIN}/login`, assign },
  });
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  if (ORIGINAL_LOCATION) {
    Object.defineProperty(window, "location", ORIGINAL_LOCATION);
  }
});

describe("LoginForm — 로그인(S)", () => {
  it("S1: 성공하면 오류·안내를 만들지 않고 '/'로 전체 이동한다", async () => {
    render(<LoginForm />);
    fill(EMAIL.signinOk);
    submit();

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    // 성공은 무음이어야 한다 — alert도 status도 남기지 않는다(상호배제 계약).
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL.signinOk,
      password: PASSWORD,
    });
  });

  // S2~S4. 원문 셋은 서로 다른 규칙 갈래를 지난다: 자격증명(열거 차단) / 좁은 규칙 /
  // 규칙표에 없는 미지의 오류. 기대값은 core 함수로 만든다 — 문구 리터럴을 여기 베끼면
  // core가 문구를 다듬을 때 두 곳이 갈라진다.
  it.each<[string, string]>([
    ["Invalid login credentials", AUTH_GENERIC_CREDENTIAL_MESSAGE],
    ["Email not confirmed", authErrorMessage("Email not confirmed")],
    ["Database is on fire", authErrorMessage("Database is on fire")],
  ])(
    "S2~S4: 실패 원문 '%s'은 core 문구로 바뀌어 alert에 뜬다",
    async (raw, expected) => {
      auth.signInWithPassword.mockResolvedValue({ error: { message: raw } });
      render(<LoginForm />);
      fill(EMAIL.signinFail);
      submit();

      await waitFor(() => expect(alertText()).toBe(expected));
      // 여기가 이 테스트의 비-동어반복 부분이다: 영문 원문이 화면으로 새면 안 된다.
      expect(alertText()).not.toContain(raw);
      expect(alertText()).not.toMatch(LATIN);
      expect(screen.queryByRole("status")).toBeNull();
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it("S5: 자격증명 실패는 '없는 계정'과 '틀린 비밀번호'를 구분하지 않는다", async () => {
    // 열거 차단의 핵심. 두 원문이 **같은 문구**로 수렴하지 않으면 이메일 가입 여부가 샌다.
    for (const raw of ["Invalid login credentials", "invalid_grant"]) {
      auth.signInWithPassword.mockResolvedValue({ error: { message: raw } });
      const view = render(<LoginForm />);
      fill(EMAIL.signinRaw);
      submit();
      await waitFor(() =>
        expect(alertText()).toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE),
      );
      view.unmount();
    }
  });
});

describe("LoginForm — 가입(U)", () => {
  function goSignup(): void {
    fireEvent.click(screen.getByRole("button", { name: "가입" }));
  }

  it("U1: 세션이 함께 오면(메일 확인 꺼짐) 로그인과 같게 '/'로 이동한다", async () => {
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: "t" } },
      error: null,
    });
    render(<LoginForm />);
    goSignup();
    fill(EMAIL.signupOk);
    submit();

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("U2: 이미 가입된 이메일도 자격증명 실패와 같은 문구로 수렴한다", async () => {
    // 가입 결과로 계정 존재를 알려주면 로그인 쪽 열거 차단이 통째로 무의미해진다.
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "User already registered" },
    });
    render(<LoginForm />);
    goSignup();
    fill(EMAIL.signupFail);
    submit();

    await waitFor(() =>
      expect(alertText()).toBe(AUTH_GENERIC_CREDENTIAL_MESSAGE),
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("U3: 세션이 없으면(메일 확인 켜짐) 이동하지 않고 안내만 남긴다", async () => {
    render(<LoginForm />);
    goSignup();
    fill(EMAIL.signupNotice);
    submit();

    const status = await screen.findByRole("status");
    // 로컬 문구라 export가 없다 — 역할 존재 + 영문 미포함으로 잠근다.
    expect(status.textContent).not.toMatch(LATIN);
    expect(status.textContent?.trim()).not.toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it("U4: 가입은 확인 메일 복귀 주소를 넘기고 상한을 소비하지 않는다", async () => {
    render(<LoginForm />);
    goSignup();
    fill(EMAIL.signupArgs);
    submit();

    await screen.findByRole("status");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: EMAIL.signupArgs,
      password: PASSWORD,
      options: { emailRedirectTo: `${ORIGIN}/auth/callback` },
    });
    // 가입은 상한 분기 밖이다 — 여기서 버킷을 태우면 가입 실패가 로그인을 잠근다.
    expect(rate.allowRequest).not.toHaveBeenCalled();
  });
});

describe("LoginForm — 비밀번호 재설정(R)", () => {
  function clickReset(): void {
    fireEvent.click(screen.getByRole("button", { name: "비밀번호를 잊으셨나요?" }));
  }

  it("R1: 이메일이 비어 있으면 요청을 보내지 않고 무엇이 필요한지 말한다", () => {
    render(<LoginForm />);
    clickReset();

    expect(alertText()).not.toMatch(LATIN);
    expect(alertText().trim()).not.toBe("");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("R2: 성공하면 존재 여부를 말하지 않는 안내와 함께 복귀 주소를 넘긴다", async () => {
    render(<LoginForm />);
    fill(EMAIL.resetOk);
    clickReset();

    const status = await screen.findByRole("status");
    expect(status.textContent).not.toMatch(LATIN);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(EMAIL.resetOk, {
      redirectTo: `${ORIGIN}/auth/callback?next=/auth/reset`,
    });
  });

  it("R3: 재설정 실패는 authErrorMessage로 바꾼다(passwordUpdateErrorMessage가 아니다)", async () => {
    // 두 함수가 **다른 답을 주는 원문**을 골랐다. 구현이 재설정 요청에 링크 만료 판정표를
    // 갖다 붙이면(흔한 혼동) 이 단언이 깨진다 — 아직 링크를 누르지도 않은 사람에게
    // "링크가 만료됐다"고 말하는 상태다.
    const raw = "Auth session missing!";
    expect(authErrorMessage(raw)).not.toBe(passwordUpdateErrorMessage(raw));

    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: raw } });
    render(<LoginForm />);
    fill(EMAIL.resetFail);
    clickReset();

    await waitFor(() => expect(alertText()).toBe(authErrorMessage(raw)));
    expect(alertText()).not.toBe(passwordUpdateErrorMessage(raw));
    expect(alertText()).not.toMatch(LATIN);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("R4: 가입 탭에서는 재설정 통로를 감춘다", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "가입" }));

    expect(
      screen.queryByRole("button", { name: "비밀번호를 잊으셨나요?" }),
    ).toBeNull();
  });
});

describe("LoginForm — 시도 상한(L)", () => {
  it("L2: 상한 키는 정규화하고, 인증 요청에는 입력 원문을 그대로 보낸다", async () => {
    // 2026-07-31 : 테스트 - 의도된비대칭 - 상한키만정규화
    // 이 비대칭은 현행 동작이고 **의도된 것**이다(LoginForm.tsx:121 vs 125). 상한은 대소문자만
    // 바꿔 우회되면 안 되고, 인증 요청은 사용자가 친 값을 서버가 판단해야 한다.
    // 여기서 "고쳐" 양쪽을 같게 만들면 계약 위반이다 — 그래서 양쪽을 함께 못박는다.
    auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<LoginForm />);
    fill(EMAIL.signinRaw);
    submit();

    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalled());
    expect(rate.allowRequest).toHaveBeenCalledWith(
      `login:${EMAIL.signinRaw.toLowerCase()}`,
      5,
      5 * 60 * 1000,
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL.signinRaw,
      password: PASSWORD,
    });
  });

  it("L1·L3: 6번째 시도는 요청을 보내지 않고, 자격증명 실패와 다른 문구를 보여준다", async () => {
    const raw = "Invalid login credentials";
    auth.signInWithPassword.mockResolvedValue({ error: { message: raw } });
    render(<LoginForm />);
    fill(EMAIL.limit);

    for (let i = 0; i < 5; i += 1) {
      submit();
      // 매번 요청이 실제로 나갔는지 확인하고 다음 시도로 넘어간다(busy 해제 대기 포함).
      await waitFor(() =>
        expect(auth.signInWithPassword).toHaveBeenCalledTimes(i + 1),
      );
      await waitFor(() => expect(alertText()).toBe(authErrorMessage(raw)));
    }

    submit();

    // 상한 문구는 로컬 문구라 export가 없다 — "자격증명 문구가 아니다"로 가른다(계약 4절).
    await waitFor(() => expect(alertText()).not.toBe(authErrorMessage(raw)));
    expect(alertText()).not.toMatch(LATIN);
    // 값은 이것이다: 6번째는 **네트워크에 나가지 않는다**.
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(5);
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("LoginForm — 재진입·상태 배타(B·X)", () => {
  it("B1: 처리 중에는 두 번째 제출이 나가지 않는다", async () => {
    let release: (value: { error: null }) => void = () => {};
    auth.signInWithPassword.mockReturnValue(
      new Promise<{ error: null }>((resolve) => {
        release = resolve;
      }),
    );
    const { container } = render(<LoginForm />);
    fill(EMAIL.busy);
    submit();

    // 1차 방어: 버튼이 잠기고 진행 중임을 말한다(마우스·키보드 사용자에게 보이는 층).
    const button = screen.getByRole("button", { name: "처리 중…" });
    expect(button.hasAttribute("disabled")).toBe(true);

    // 2차 방어: 버튼을 우회해 폼을 직접 제출해도(엔터 연타·자동화) 핸들러가 되돌아 나간다.
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);

    release({ error: null });
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it("X1: 탭을 바꾸면 앞 결과가 지워진다(alert와 status는 공존하지 않는다)", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<LoginForm />);
    fill(EMAIL.switchTab);
    submit();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "가입" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    // 가입 성공 안내를 띄운 뒤 로그인 탭으로 돌아가면 그 안내도 사라져야 한다.
    submit();
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
