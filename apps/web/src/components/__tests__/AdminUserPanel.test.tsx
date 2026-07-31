// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  listAccessProfiles,
  setUserDisabledFeatures,
  setUserRole,
  type AccessProfile,
} from "@ldd/api";
import { roleLabel } from "@ldd/core";
import { AdminUserPanel } from "@/components/AdminUserPanel";

// 2026-07-31 : 테스트 - 관리자사용자관리 - 렌더층계약
// 이 파일이 지키는 계층은 **렌더**다. 역할별 자기 관리자 해제 차단은
// packages/api/src/access.test.ts가 이미 잠갔다(151행) — 여기서 다시 단언하지 않는다.

vi.mock("@ldd/api", () => ({
  listAccessProfiles: vi.fn(),
  setUserRole: vi.fn(),
  setUserDisabledFeatures: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const PROFILE: AccessProfile = {
  id: "user-a",
  email: "a@example.com",
  displayName: "오리 A",
  avatarUrl: null,
  role: "user",
  disabledFeatures: [],
  dashboardLayout: { order: [], hidden: [] },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminUserPanel — 비관리자", () => {
  it("관리자만 볼 수 있다는 안내만 보여주고 역할·기능 버튼은 렌더하지 않는다", () => {
    render(<AdminUserPanel myRole="user" />);

    expect(
      screen.getByText("사용자 관리는 관리자만 볼 수 있어요."),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: roleLabel("admin") }),
    ).toBeNull();
  });
});

describe("AdminUserPanel — 관리자", () => {
  it("목록을 불러와 역할 상태를 aria-pressed로 보여준다", async () => {
    vi.mocked(listAccessProfiles).mockResolvedValue([PROFILE]);

    render(<AdminUserPanel myRole="admin" />);

    await waitFor(() => expect(listAccessProfiles).toHaveBeenCalledWith({}));
    const userButton = await screen.findByRole("button", {
      name: roleLabel("user"),
    });
    expect(userButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("역할 변경 버튼을 누르면 setUserRole을 호출하고 목록을 다시 불러온다", async () => {
    vi.mocked(listAccessProfiles).mockResolvedValue([PROFILE]);
    vi.mocked(setUserRole).mockResolvedValue(undefined);

    render(<AdminUserPanel myRole="admin" />);
    await waitFor(() => expect(listAccessProfiles).toHaveBeenCalledTimes(1));

    fireEvent.click(
      await screen.findByRole("button", { name: roleLabel("admin") }),
    );

    await waitFor(() =>
      expect(setUserRole).toHaveBeenCalledWith({}, "user-a", "admin"),
    );
    await waitFor(() =>
      expect(listAccessProfiles).toHaveBeenCalledTimes(2),
    );
  });

  it("역할 변경 실패(빈 메시지)는 fallback 문구를 보여준다", async () => {
    vi.mocked(listAccessProfiles).mockResolvedValue([PROFILE]);
    vi.mocked(setUserRole).mockRejectedValue(new Error(""));

    render(<AdminUserPanel myRole="admin" />);
    fireEvent.click(
      await screen.findByRole("button", { name: roleLabel("admin") }),
    );

    expect(
      await screen.findByText("역할을 바꾸지 못했어요."),
    ).not.toBeNull();
  });

  it("역할 변경 실패(원문 있음)는 원문 그대로 보여준다", async () => {
    vi.mocked(listAccessProfiles).mockResolvedValue([PROFILE]);
    vi.mocked(setUserRole).mockRejectedValue(new Error("디비 연결 실패"));

    render(<AdminUserPanel myRole="admin" />);
    fireEvent.click(
      await screen.findByRole("button", { name: roleLabel("admin") }),
    );

    expect(await screen.findByText("디비 연결 실패")).not.toBeNull();
  });

  it("기능 토글 버튼을 누르면 setUserDisabledFeatures를 다음 목록으로 호출한다", async () => {
    const updated: AccessProfile = { ...PROFILE, disabledFeatures: ["news"] };
    vi.mocked(listAccessProfiles)
      .mockResolvedValueOnce([PROFILE])
      .mockResolvedValueOnce([updated]);
    vi.mocked(setUserDisabledFeatures).mockResolvedValue(["news"]);

    render(<AdminUserPanel myRole="admin" />);

    fireEvent.click(await screen.findByRole("button", { name: "뉴스" }));

    await waitFor(() =>
      expect(setUserDisabledFeatures).toHaveBeenCalledWith(
        {},
        "user-a",
        ["news"],
      ),
    );
    await waitFor(() =>
      expect(listAccessProfiles).toHaveBeenCalledTimes(2),
    );
  });

  it("처리 중에는 모든 버튼이 잠겨 재진입을 막는다", async () => {
    vi.mocked(listAccessProfiles).mockResolvedValue([PROFILE]);
    let release: () => void = () => {};
    vi.mocked(setUserRole).mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(undefined);
      }),
    );

    render(<AdminUserPanel myRole="admin" />);
    const adminButton = await screen.findByRole("button", {
      name: roleLabel("admin"),
    });
    fireEvent.click(adminButton);

    await waitFor(() => expect(setUserRole).toHaveBeenCalledTimes(1));
    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("disabled")).toBe(true);
    }
    fireEvent.click(adminButton);
    expect(setUserRole).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() =>
      expect(listAccessProfiles).toHaveBeenCalledTimes(2),
    );
  });
});
