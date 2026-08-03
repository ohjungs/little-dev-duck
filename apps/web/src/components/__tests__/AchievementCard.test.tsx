// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementCard } from "@/components/AchievementCard";

describe("AchievementCard", () => {
  it("canvas가 role=img과 레벨/XP/먹이 값을 담은 aria-label을 갖는다", () => {
    render(<AchievementCard level={7} xp={340} feed={62} onClose={vi.fn()} />);

    const canvas = screen.getByRole("img", { name: "레벨 7, XP 340, 먹이 62" });
    expect(canvas.tagName).toBe("CANVAS");
  });

  it("level/xp/feed가 바뀌면 aria-label도 그 값을 반영한다", () => {
    const { rerender } = render(
      <AchievementCard level={1} xp={0} feed={100} onClose={vi.fn()} />,
    );
    expect(
      screen.getByRole("img", { name: "레벨 1, XP 0, 먹이 100" }),
    ).not.toBeNull();

    rerender(<AchievementCard level={2} xp={50} feed={30} onClose={vi.fn()} />);
    expect(
      screen.getByRole("img", { name: "레벨 2, XP 50, 먹이 30" }),
    ).not.toBeNull();
  });

  it('바깥 dialog의 role과 aria-label("성과 카드")은 그대로 유지된다', () => {
    render(<AchievementCard level={7} xp={340} feed={62} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("성과 카드");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
