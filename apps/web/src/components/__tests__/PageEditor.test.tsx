// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Page } from "@ldd/core";
import {
  createPage,
  createPageVersion,
  listBacklinks,
  listChildPages,
  listPages,
  publishPage,
  recordEvent,
  searchPages,
  unpublishPage,
  updatePage,
  updatePageCover,
} from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import { PageEditor } from "@/components/PageEditor";

// 2026-08-02 : 테스트 - PageEditor - 렌더/저장/롤백 계약 잠금
// 계약 정찰 결과(오케스트레이터 전달)를 그대로 따른다: @ldd/api·@ldd/ai·supabase client·
// next/navigation을 모킹하고, BlockEditor는 스텁으로 대체해 BlockNote 내부 상태와 분리한다
// (BlockEditor 자체 렌더 계약은 BlockEditor.test.tsx가 별도로 잠근다).

vi.mock("@ldd/api", () => ({
  createPage: vi.fn(),
  createPageVersion: vi.fn(),
  listBacklinks: vi.fn(),
  listChildPages: vi.fn(),
  publishPage: vi.fn(),
  unpublishPage: vi.fn(),
  updatePage: vi.fn(),
  updatePageCover: vi.fn(),
  recordEvent: vi.fn(),
  listPages: vi.fn(),
  searchPages: vi.fn(),
}));
vi.mock("@ldd/ai", () => ({ reindexSource: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/components/BlockEditor", () => ({
  BlockEditor: () => <div data-testid="block-editor-stub" />,
}));

const BASE_PAGE: Page = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "22222222-2222-2222-2222-222222222222",
  parentId: null,
  title: "테스트 페이지",
  content: [],
  plainText: "",
  icon: null,
  isTrashed: false,
  trashedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  dbSchema: null,
  rowProps: {},
  isPublic: false,
  publicSlug: null,
  coverUrl: null,
};

beforeEach(() => {
  vi.mocked(listBacklinks).mockResolvedValue([]);
  vi.mocked(recordEvent).mockResolvedValue(undefined);
  vi.mocked(listPages).mockResolvedValue([]);
  vi.mocked(searchPages).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("PageEditor — 렌더", () => {
  it("제목·아이콘·브레드크럼·BlockEditor 스텁을 렌더한다", async () => {
    const parent: Page = { ...BASE_PAGE, id: "parent-id", title: "부모 페이지" };
    render(<PageEditor page={BASE_PAGE} breadcrumb={[parent]} />);

    expect(
      (screen.getByLabelText("페이지 제목") as HTMLInputElement).value,
    ).toBe("테스트 페이지");
    expect(screen.getByText("부모 페이지")).not.toBeNull();
    expect(await screen.findByTestId("block-editor-stub")).not.toBeNull();
    await waitFor(() =>
      expect(recordEvent).toHaveBeenCalledWith(
        {},
        { name: "page:view", detail: "테스트 페이지" },
      ),
    );
  });

  it("breadcrumb를 넘기지 않으면 상위 체인 없이 기본 경로만 보여준다", () => {
    render(<PageEditor page={BASE_PAGE} />);
    expect(screen.getByText("테스트 페이지")).not.toBeNull();
    expect(screen.getByText("페이지")).not.toBeNull();
  });

  it("마운트 시 listBacklinks를 조회해 성공하면 백링크 목록을 보여준다", async () => {
    vi.mocked(listBacklinks).mockResolvedValue([
      { sourcePageId: "src-1", sourceTitle: "다른 페이지" },
    ]);
    render(<PageEditor page={BASE_PAGE} />);
    expect(await screen.findByText("다른 페이지")).not.toBeNull();
    expect(screen.getByText("백링크 (1)")).not.toBeNull();
  });
});

describe("PageEditor — 디바운스 자동저장", () => {
  it("제목을 바꾸면 800ms 뒤 updatePage로 저장하고 onSaved·reindexSource를 호출한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const updated = { ...BASE_PAGE, title: "새 제목", plainText: "" };
    vi.mocked(updatePage).mockResolvedValue(updated);
    const onSaved = vi.fn();

    render(<PageEditor page={BASE_PAGE} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("페이지 제목"), {
      target: { value: "새 제목" },
    });
    expect(screen.getByText("저장 중...")).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await vi.waitFor(() =>
      expect(updatePage).toHaveBeenCalledWith({}, BASE_PAGE.id, {
        title: "새 제목",
        content: [],
      }),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith({
      title: "새 제목",
      content: updated.content,
    }));
    expect(reindexSource).toHaveBeenCalledWith({
      sourceType: "page",
      sourceId: BASE_PAGE.id,
      text: "",
    });
  });

  it("저장이 실패하면 저장 실패 문구와 다시 시도 버튼을 보여주고, 눌러 재시도한다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(updatePage).mockRejectedValueOnce(new Error("network"));
    vi.mocked(updatePage).mockResolvedValueOnce(BASE_PAGE);

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.change(screen.getByLabelText("페이지 제목"), {
      target: { value: "실패할 제목" },
    });
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(await screen.findByText("저장 실패")).not.toBeNull();
    const retry = screen.getByRole("button", { name: "저장 다시 시도" });

    fireEvent.click(retry);
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    await vi.waitFor(() => expect(updatePage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("저장됨")).not.toBeNull();
  });

  it("언마운트 시 대기 중인 저장을 즉시 발화한다(유실 방지)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(updatePage).mockResolvedValue(BASE_PAGE);

    const { unmount } = render(<PageEditor page={BASE_PAGE} />);
    fireEvent.change(screen.getByLabelText("페이지 제목"), {
      target: { value: "언마운트 직전 편집" },
    });

    // 800ms가 지나기 전에 언마운트해도 flushPendingSave가 즉시 저장을 발화해야 한다.
    unmount();

    await vi.waitFor(() =>
      expect(updatePage).toHaveBeenCalledWith({}, BASE_PAGE.id, {
        title: "언마운트 직전 편집",
        content: [],
      }),
    );
  });
});

describe("PageEditor — 즐겨찾기", () => {
  it("즐겨찾기 버튼을 누르면 localStorage를 토글하고 aria-pressed가 바뀐다", async () => {
    render(<PageEditor page={BASE_PAGE} />);
    const btn = screen.getByRole("button", { name: "즐겨찾기" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(btn);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "즐겨찾기됨" }).getAttribute(
          "aria-pressed",
        ),
      ).toBe("true"),
    );
  });
});

describe("PageEditor — 데이터베이스로 전환", () => {
  it("전환 버튼을 누르면 dbSchema를 생성해 updatePage를 호출한다", async () => {
    vi.mocked(updatePage).mockResolvedValue(BASE_PAGE);
    vi.mocked(listChildPages).mockResolvedValue([]);

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /데이터베이스로 전환/ }));

    await waitFor(() => expect(updatePage).toHaveBeenCalledTimes(1));
    const [, id, patch] = vi.mocked(updatePage).mock.calls[0];
    expect(id).toBe(BASE_PAGE.id);
    expect(patch.dbSchema).toBeTruthy();
  });

  it("전환 저장이 실패하면 상태를 롤백하고 실패 메시지를 보여준다", async () => {
    vi.mocked(updatePage).mockRejectedValue(new Error("fail"));

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /데이터베이스로 전환/ }));

    expect(await screen.findByText("데이터베이스 전환에 실패했습니다.")).not.toBeNull();
    // 롤백 후에는 다시 "데이터베이스로 전환" 버튼이 보여야 한다(dbSchema가 null로 복귀).
    expect(
      screen.getByRole("button", { name: /데이터베이스로 전환/ }),
    ).not.toBeNull();
  });
});

describe("PageEditor — 공개/비공개", () => {
  it("웹에 공개 버튼을 누르면 publishPage를 호출하고 공개 링크 복사 버튼으로 바뀐다", async () => {
    vi.mocked(publishPage).mockResolvedValue({ slug: "abc123" });
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /웹에 공개/ }));

    await waitFor(() => expect(publishPage).toHaveBeenCalledWith({}, BASE_PAGE.id));
    expect(await screen.findByRole("button", { name: /공개 링크 복사/ })).not.toBeNull();
  });

  it("공개 실패 시 안내 메시지를 보여준다", async () => {
    vi.mocked(publishPage).mockRejectedValue(new Error("fail"));

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /웹에 공개/ }));

    expect(await screen.findByText("공개에 실패했습니다.")).not.toBeNull();
  });

  it("공개 취소를 누르면 unpublishPage를 호출하고 실패 시 롤백한다", async () => {
    vi.mocked(unpublishPage).mockRejectedValue(new Error("fail"));
    const published: Page = { ...BASE_PAGE, publicSlug: "abc123" };

    render(<PageEditor page={published} />);
    fireEvent.click(screen.getByRole("button", { name: "공개 취소" }));

    await waitFor(() => expect(unpublishPage).toHaveBeenCalledWith({}, BASE_PAGE.id));
    expect(await screen.findByText("공개 취소에 실패했습니다.")).not.toBeNull();
    // 롤백돼 다시 "공개 링크 복사"가 보여야 한다.
    expect(screen.getByRole("button", { name: /공개 링크 복사/ })).not.toBeNull();
  });
});

describe("PageEditor — 복제", () => {
  it("복제 버튼을 누르면 createPage 후 새 페이지로 이동한다", async () => {
    const created = { ...BASE_PAGE, id: "new-page-id" };
    vi.mocked(createPage).mockResolvedValue(created);

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "복제" }));

    await waitFor(() =>
      expect(createPage).toHaveBeenCalledWith({}, {
        title: "테스트 페이지 (복사본)",
        content: [],
        icon: null,
        parentId: null,
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pages/new-page-id"));
  });

  it("복제가 실패하면 안내 메시지를 보여준다", async () => {
    vi.mocked(createPage).mockRejectedValue(new Error("fail"));

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "복제" }));

    expect(await screen.findByText("복제에 실패했습니다.")).not.toBeNull();
  });
});

describe("PageEditor — 버전 저장", () => {
  it("버전 저장 버튼을 누르면 대기 중 저장을 먼저 발화한 뒤 createPageVersion을 호출한다", async () => {
    vi.mocked(updatePage).mockResolvedValue(BASE_PAGE);
    vi.mocked(createPageVersion).mockResolvedValue({
      id: "v1",
      pageId: BASE_PAGE.id,
      userId: BASE_PAGE.userId,
      title: BASE_PAGE.title,
      content: [],
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: /버전 저장/ }));

    await waitFor(() => expect(createPageVersion).toHaveBeenCalledWith({}, { pageId: BASE_PAGE.id }));
    expect(await screen.findByText("버전이 저장되었습니다.")).not.toBeNull();
  });
});

describe("PageEditor — 커버 이미지 롤백", () => {
  it("커버 저장 실패 시 이전 상태로 롤백하고 메시지를 보여준다", async () => {
    vi.mocked(updatePageCover).mockRejectedValue(new Error("fail"));

    render(<PageEditor page={BASE_PAGE} />);
    fireEvent.click(screen.getByRole("button", { name: "커버 추가" }));
    fireEvent.change(screen.getByPlaceholderText("https://example.com/image.jpg"), {
      target: { value: "https://example.com/cover.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));

    await waitFor(() =>
      expect(updatePageCover).toHaveBeenCalledWith(
        {},
        BASE_PAGE.id,
        "https://example.com/cover.jpg",
      ),
    );
    expect(await screen.findByText("커버 이미지 저장에 실패했습니다.")).not.toBeNull();
    // 롤백되어 커버가 없으므로 "커버 추가" 버튼이 다시 보인다.
    expect(screen.getByRole("button", { name: "커버 추가" })).not.toBeNull();
  });
});
