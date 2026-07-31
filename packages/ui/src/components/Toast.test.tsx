import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast, type ToastType } from "./Toast";

// 2026-07-31 : 테스트 - 접근성 - ToastType role 전수성 잠금
// type -> role 매핑을 Record<ToastType, ...>로 선언해 두면 유니온이 늘어난 순간(예: "warning")
// 이 리터럴이 키 누락으로 tsc RED가 된다. 즉 "새 type을 추가했는데 role을 안 정했다"를
// 런타임이 아니라 타입체크에서 잡는다. 캐스팅을 쓰면 이 잠금이 풀리므로 쓰지 않는다.
const ROLE_BY_TYPE: Record<ToastType, "status" | "alert"> = {
  info: "status",
  error: "alert",
};

// 순회용 케이스. 전수성 보장은 위 Record가 지고, 여기는 렌더 단언만 돌린다.
const ROLE_CASES: { type: ToastType; role: "status" | "alert" }[] = [
  { type: "info", role: ROLE_BY_TYPE.info },
  { type: "error", role: ROLE_BY_TYPE.error },
];

// 2026-07-31 : 테스트 - 환경한계 - jsdom레이아웃없음
// jsdom에는 레이아웃 엔진이 없다. offsetParent/getBoundingClientRect/getComputedStyle의
// 계산값이 실제 브라우저와 다르거나 하드코딩(offsetParent는 항상 null)이라, "화면에 보이는가",
// "우하단에 떠 있는가", "포커스 트랩이 Tab으로 도는가" 류는 여기서 검증할 수 없다.
// 억지로 통과시키는 단언은 거짓 검증이므로 쓰지 않는다. 그 층은 Playwright e2e 몫이다.
// 이 파일이 지키는 계약은 두 가지뿐이다: (1) 접근성 role이 type에 따라 status/alert로 갈리는가,
// (2) 자동 소멸 타이머가 onDismiss 유무·durationMs·언마운트에 정확히 반응하는가.

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("type 미지정이면 role=status로 렌더하고 alert는 만들지 않는다", () => {
    render(<Toast message="저장했습니다" />);

    expect(screen.getByRole("status").textContent).toBe("저장했습니다");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("type=error면 role=alert로 렌더하고 status는 만들지 않는다", () => {
    render(<Toast message="저장에 실패했습니다" type="error" />);

    expect(screen.getByRole("alert").textContent).toBe("저장에 실패했습니다");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("onDismiss가 없으면 타이머를 걸지 않는다", () => {
    render(<Toast message="계속 떠 있는 알림" />);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("기본 durationMs(5000) 직전에는 안 부르고 정확히 5000ms에 한 번 부른다", () => {
    const onDismiss = vi.fn();
    render(<Toast message="곧 사라짐" onDismiss={onDismiss} />);

    vi.advanceTimersByTime(4999);
    expect(onDismiss).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("durationMs를 주면 그 시각에 한 번 부른다", () => {
    const onDismiss = vi.fn();
    render(<Toast message="빨리 사라짐" onDismiss={onDismiss} durationMs={100} />);

    vi.advanceTimersByTime(100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("타임아웃 전에 언마운트되면 타이머가 정리돼 onDismiss를 부르지 않는다", () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<Toast message="중간에 사라짐" onDismiss={onDismiss} />);

    unmount();
    vi.advanceTimersByTime(10000);

    expect(onDismiss).toHaveBeenCalledTimes(0);
  });

  // 2026-07-31 : 테스트 - 경계값 - durationMs0은지연0이지동기아님
  // durationMs=0은 "즉시 소멸"이 아니라 setTimeout(fn, 0) = 다음 매크로태스크다. 렌더 직후에는
  // 아직 안 불리고, 타이머를 0ms 진행시켜야 불린다. 이 두 시점을 한 테스트에서 같이 못박는다.
  it("T-B1: durationMs=0이어도 렌더 직후가 아니라 타이머 0ms 진행 시점에 한 번 부른다", () => {
    const onDismiss = vi.fn();
    render(<Toast message="즉시 사라짐" onDismiss={onDismiss} durationMs={0} />);

    expect(onDismiss).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(0);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("T-N1: message가 빈 문자열이면 role=status 컨테이너만 남고 내용은 비어 있다", () => {
    // 현행 동작의 성문화다. 빈 메시지를 아예 렌더하지 않는 쪽이 나을 수 있으나(스크린리더가
    // 빈 라이브리전을 읽고 지나감) 그 판단은 계약 밖이라 여기서 바꾸지 않는다.
    render(<Toast message="" />);

    expect(screen.getByRole("status").textContent).toBe("");
  });

  // 2026-07-31 : 테스트 - 타이머 - 마운트기준1회확정
  // 실제 호출부는 onDismiss를 인라인 화살표로 넘겨 매 렌더 새 함수다. 소멸 시각이 콜백
  // identity에 묶여 있으면 부모가 리렌더될 때마다 타이머가 연장돼 토스트가 영영 안 사라진다.
  // 아래는 (1) 리렌더가 시각을 밀지 않는가, (2) 그러면서도 낡은 클로저가 아니라 최신 콜백을
  // 부르는가를 한 번에 못박는다. 둘 중 하나만 보면 ref 도입을 잘못 구현해도 통과한다.
  it("T-B2: 부모 리렌더로 onDismiss가 새 함수가 돼도 소멸 시각은 마운트 기준 그대로다", () => {
    const dismissed = vi.fn();
    const { rerender } = render(
      <Toast message="유지" onDismiss={() => dismissed("첫 콜백")} />,
    );

    vi.advanceTimersByTime(4000);
    rerender(<Toast message="유지" onDismiss={() => dismissed("새 콜백")} />);

    // 리렌더가 타이머를 리셋했다면 여기서부터 5000ms를 더 기다려야 한다.
    vi.advanceTimersByTime(999);
    expect(dismissed).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(dismissed).toHaveBeenCalledWith("새 콜백");
  });

  it.each(ROLE_CASES)(
    "T-C1: type=$type은 role=$role로 렌더하고 반대편 role은 만들지 않는다",
    ({ type, role }) => {
      const other = role === "status" ? "alert" : "status";

      render(<Toast message="역할 전수 확인" type={type} />);

      expect(screen.getByRole(role)).not.toBeNull();
      expect(screen.queryByRole(other)).toBeNull();
    },
  );
});
