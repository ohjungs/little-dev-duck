import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast } from "./Toast";

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
});
