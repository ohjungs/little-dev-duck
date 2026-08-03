// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Page } from "@ldd/core";
import {
  createPage,
  getPage,
  listPages,
  listTrashedPages,
  softDeletePage,
} from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import { subscribeTable } from "@/lib/realtime";
import { PAGE_TEMPLATES } from "@/lib/pageTemplates";
import { PageWorkspace } from "@/components/PageWorkspace";

// 2026-08-02 : 테스트 - PageWorkspace - 트리/CRUD/라우팅 계약 잠금
// PageEditor는 스텁으로 대체해 **워크스페이스 자체의 계약**(목록 조회·트리 구성·검색·정렬·
// 생성/복제/삭제의 낙관적 업데이트+롤백·pageId→PageEditor 전달)만 좁혀 검증한다. PageEditor
// 내부 동작(저장·공개 등)은 PageEditor.test.tsx가 이미 잠갔다 — 여기서 다시 단언하지 않는다.

const { mockSupabase } = vi.hoisted(() => ({
  // 실 컴포넌트가 useMemo(() => createClient(), [])로 단 하나의 인스턴스를 잡아 모든 API 호출에
  // 그대로 넘긴다 — 테스트도 리터럴 {}가 아니라 이 같은 참조로 단언해야 한다.
  mockSupabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

vi.mock("@ldd/api", () => ({
  createPage: vi.fn(),
  getPage: vi.fn(),
  listPages: vi.fn(),
  listTrashedPages: vi.fn(),
  softDeletePage: vi.fn(),
}));
vi.mock("@ldd/ai", () => ({ reindexSource: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => mockSupabase }));
vi.mock("@/lib/realtime", () => ({ subscribeTable: vi.fn(() => () => {}) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/components/PageEditor", () => ({
  PageEditor: ({ page }: { page: Page }) => (
    <div data-testid="page-editor-stub">편집 중: {page.title}</div>
  ),
}));

function makePage(overrides: Partial<Page>): Page {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    parentId: null,
    title: "페이지",
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(listTrashedPages).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("PageWorkspace — 목록 조회", () => {
  it("불러오는 중 → 빈 상태(다음 행동 안내)를 보여준다", async () => {
    vi.mocked(listPages).mockResolvedValue([]);
    render(<PageWorkspace pageId={null} />);

    expect(screen.getByText("불러오는 중...")).not.toBeNull();
    expect(
      await screen.findByText("아직 페이지가 없어요."),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "템플릿으로 시작하기 →" }),
    ).not.toBeNull();
  });

  it("조회 실패 시 에러 문구를 보여준다", async () => {
    vi.mocked(listPages).mockRejectedValue(new Error("boom"));
    render(<PageWorkspace pageId={null} />);
    expect(
      await screen.findByText("목록을 불러오지 못했습니다."),
    ).not.toBeNull();
  });

  it("페이지 목록을 트리로 렌더하고 부모-자식 들여쓰기를 반영한다", async () => {
    const parent = makePage({ id: "p1", title: "부모" });
    const child = makePage({ id: "c1", parentId: "p1", title: "자식" });
    vi.mocked(listPages).mockResolvedValue([parent, child]);

    render(<PageWorkspace pageId={null} />);

    expect(await screen.findByText("부모")).not.toBeNull();
    expect(screen.getByText("자식")).not.toBeNull();
  });
});

describe("PageWorkspace — pageId 선택", () => {
  it("pageId가 목록에 있으면 PageEditor에 해당 페이지를 넘긴다", async () => {
    const target = makePage({ id: "target-id", title: "선택된 페이지" });
    vi.mocked(listPages).mockResolvedValue([target]);

    render(<PageWorkspace pageId="target-id" />);

    expect(
      await screen.findByText("편집 중: 선택된 페이지"),
    ).not.toBeNull();
  });

  it("pageId가 null이고 페이지가 있으면 '왼쪽에서 페이지를 선택하세요' 안내를 보여준다", async () => {
    vi.mocked(listPages).mockResolvedValue([makePage({ id: "p1" })]);
    render(<PageWorkspace pageId={null} />);
    expect(
      await screen.findByText("왼쪽에서 페이지를 선택하세요."),
    ).not.toBeNull();
  });

  it("pageId가 목록에 없는 id면(예: 삭제됨) 빈 상태로 폴백한다", async () => {
    vi.mocked(listPages).mockResolvedValue([makePage({ id: "other" })]);
    render(<PageWorkspace pageId="missing-id" />);
    await waitFor(() =>
      expect(screen.queryByTestId("page-editor-stub")).toBeNull(),
    );
  });

  // 2026-08-02 : 테스트 - PageWorkspace - content 유실 회귀 고정
  // listPages는 content 컬럼을 뺀 얕은 레코드를 준다(pages.ts listPages 주석 참고). 선택된 페이지가
  // 아직 얕은 상태(content === null)면 PageEditor를 곧바로 마운트하지 않고 getPage로 본문을 채운
  // 뒤에만 마운트해야 한다 — 그렇지 않으면 BlockNote가 initialContent=null로 굳어(재마운트 전까지
  // 반영 안 됨) 새로고침 시 본문이 빈 문서로 보이는 버그가 재발한다.
  it("선택된 페이지의 content가 아직 없으면 PageEditor 대신 로딩 상태를 보여주고, getPage로 채워지면 마운트한다", async () => {
    const shallow = makePage({ id: "p1", title: "본문 채워질 페이지", content: null });
    vi.mocked(listPages).mockResolvedValue([shallow]);
    let resolveGetPage!: (page: Page) => void;
    vi.mocked(getPage).mockReturnValue(
      new Promise<Page>((resolve) => {
        resolveGetPage = resolve;
      }),
    );

    render(<PageWorkspace pageId="p1" />);
    await screen.findByText("본문 채워질 페이지");

    expect(screen.queryByTestId("page-editor-stub")).toBeNull();
    expect(screen.getByRole("status", { name: "페이지를 불러오는 중" })).not.toBeNull();

    resolveGetPage(makePage({ id: "p1", title: "본문 채워질 페이지", content: [{ type: "paragraph" }] }));

    expect(
      await screen.findByText("편집 중: 본문 채워질 페이지"),
    ).not.toBeNull();
  });

  // 2026-08-02 : 테스트 - PageWorkspace - realtime 재조회 content 유실(리마운트 경합) 회귀 고정
  // listPages는 content를 조회하지 않아 항상 null을 준다. realtime 이벤트(자기 자신의 저장
  // 왕복 포함)마다 fetchPages()가 재실행되는데, 그 결과로 이미 getPage/자동저장으로 채워둔
  // "현재 편집 중" 페이지의 content가 다시 null로 덮이면 렌더 게이트가 PageEditor를 강제
  // 언마운트시켜 title 등 로컬 편집 state가 유실된다("복제 시 제목 없음" 회귀의 원인).
  it("content를 채운 뒤 realtime 이벤트로 재조회해도 content를 잃지 않아 에디터가 리마운트되지 않는다", async () => {
    // 다른 테스트에 영향이 남지 않도록 Once로 이 테스트의 1회 호출에만 적용한다
    // (이 효과는 마운트 시 1회만 getUser를 호출한다).
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "u1" } },
    });
    const shallow = makePage({ id: "p1", title: "편집 중인 페이지", content: null });
    vi.mocked(listPages).mockResolvedValue([shallow]);
    let resolveGetPage!: (page: Page) => void;
    vi.mocked(getPage).mockReturnValue(
      new Promise<Page>((resolve) => {
        resolveGetPage = resolve;
      }),
    );

    render(<PageWorkspace pageId="p1" />);
    await screen.findByText("편집 중인 페이지");
    expect(screen.queryByTestId("page-editor-stub")).toBeNull();

    resolveGetPage(
      makePage({
        id: "p1",
        title: "편집 중인 페이지",
        content: [{ type: "paragraph" }],
      }),
    );
    await screen.findByText("편집 중: 편집 중인 페이지");

    await waitFor(() => expect(subscribeTable).toHaveBeenCalled());
    const onChange = vi.mocked(subscribeTable).mock.calls[0][3];

    // realtime 이벤트 시뮬레이션: fetchPages()가 재실행되고, listPages 모의값은 여전히
    // content: null인 얕은 레코드를 준다(실제 DB 응답과 동일한 모양).
    onChange();
    await waitFor(() => expect(listPages).toHaveBeenCalledTimes(2));

    // 병합 로직이 이미 채운 content를 지켜, 에디터가 로딩 상태로 되돌아가거나 재마운트되지 않는다.
    expect(screen.getByTestId("page-editor-stub")).not.toBeNull();
    expect(screen.getByText("편집 중: 편집 중인 페이지")).not.toBeNull();
    // content가 유지됐다면 "본문유실 보강" 이펙트가 다시 getPage를 부를 이유가 없다.
    expect(getPage).toHaveBeenCalledTimes(1);
  });
});

describe("PageWorkspace — 새 페이지 생성", () => {
  it("빈 상태의 '새 페이지' 버튼을 누르면 createPage 후 이동한다", async () => {
    vi.mocked(listPages).mockResolvedValue([]);
    const created = makePage({ id: "new-1", title: "" });
    vi.mocked(createPage).mockResolvedValue(created);

    render(<PageWorkspace pageId={null} />);
    fireEvent.click(await screen.findByRole("button", { name: "새 페이지" }));

    await waitFor(() =>
      expect(createPage).toHaveBeenCalledWith(
        mockSupabase,
        { title: "", content: [], dbSchema: undefined },
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pages/new-1"));
  });

  it("생성이 실패하면 actionError를 보여준다", async () => {
    vi.mocked(listPages).mockResolvedValue([]);
    vi.mocked(createPage).mockRejectedValue(new Error("fail"));

    render(<PageWorkspace pageId={null} />);
    fireEvent.click(await screen.findByRole("button", { name: "새 페이지" }));

    expect(
      await screen.findByText("페이지를 만들지 못했습니다. 다시 시도해 주세요."),
    ).not.toBeNull();
  });

  // 2026-08-02 : 테스트 - PageWorkspace - 템플릿으로 새 페이지 생성 계약 잠금
  // "회의록"은 datedTitle이 없어 제목이 날짜와 무관하게 결정적이다(daily/weekly-retro/diary는
  // 만든 날짜가 붙어 비결정적이라 피한다). 메뉴 열림(aria-expanded) → 템플릿 클릭 → createPage
  // 인자가 템플릿의 title/content 그대로, dbSchema는 undefined로 전달되는지 확인한다.
  it("템플릿 메뉴에서 '회의록'을 고르면 해당 템플릿의 제목·본문으로 createPage를 호출한다", async () => {
    vi.mocked(listPages).mockResolvedValue([]);
    const meeting = PAGE_TEMPLATES.find((t) => t.key === "meeting")!;
    vi.mocked(createPage).mockResolvedValue(makePage({ id: "tpl-meeting" }));

    render(<PageWorkspace pageId={null} />);
    const menuButton = await screen.findByRole("button", {
      name: "새 페이지 메뉴",
    });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByText(meeting.label).closest("button")!);

    await waitFor(() =>
      expect(createPage).toHaveBeenCalledWith(mockSupabase, {
        title: meeting.title,
        content: meeting.content,
        dbSchema: undefined,
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/pages/tpl-meeting"),
    );
  });

  // 데이터베이스 템플릿("프로젝트 트래커")은 dbSchema가 그대로 전달돼야 표/보드 뷰가 살아난다.
  it("데이터베이스 템플릿을 고르면 dbSchema가 함께 createPage로 전달된다", async () => {
    vi.mocked(listPages).mockResolvedValue([]);
    const tracker = PAGE_TEMPLATES.find((t) => t.key === "project-tracker")!;
    vi.mocked(createPage).mockResolvedValue(makePage({ id: "tpl-tracker" }));

    render(<PageWorkspace pageId={null} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "새 페이지 메뉴" }),
    );
    fireEvent.click(screen.getByText(tracker.label).closest("button")!);

    await waitFor(() =>
      expect(createPage).toHaveBeenCalledWith(mockSupabase, {
        title: tracker.title,
        content: tracker.content,
        dbSchema: tracker.dbSchema,
      }),
    );
  });
});

describe("PageWorkspace — 검색·정렬", () => {
  it("검색어로 트리를 필터링한다", async () => {
    vi.mocked(listPages).mockResolvedValue([
      makePage({ id: "a", title: "회의록" }),
      makePage({ id: "b", title: "일기" }),
    ]);
    render(<PageWorkspace pageId={null} />);

    await screen.findByText("회의록");
    fireEvent.change(screen.getByLabelText("페이지 검색"), {
      target: { value: "일기" },
    });

    expect(screen.queryByText("회의록")).toBeNull();
    expect(screen.getByText("일기")).not.toBeNull();
  });

  it("검색 결과가 없으면 안내 문구를 보여준다", async () => {
    vi.mocked(listPages).mockResolvedValue([makePage({ id: "a", title: "회의록" })]);
    render(<PageWorkspace pageId={null} />);
    await screen.findByText("회의록");

    fireEvent.change(screen.getByLabelText("페이지 검색"), {
      target: { value: "존재하지않음" },
    });

    expect(await screen.findByText("검색 결과가 없습니다.")).not.toBeNull();
  });

  it("이름순 정렬로 바꾸면 제목 오름차순으로 보여준다", async () => {
    vi.mocked(listPages).mockResolvedValue([
      makePage({ id: "b", title: "나나" }),
      makePage({ id: "a", title: "가가" }),
    ]);
    render(<PageWorkspace pageId={null} />);
    await screen.findByText("나나");

    fireEvent.change(screen.getByLabelText("페이지 정렬 기준"), {
      target: { value: "name" },
    });

    const links = screen
      .getAllByRole("link")
      .filter((el) => el.textContent === "가가" || el.textContent === "나나");
    expect(links.map((el) => el.textContent)).toEqual(["가가", "나나"]);
  });
});

describe("PageWorkspace — 삭제(낙관적 업데이트)", () => {
  it("삭제 버튼을 누르면 즉시 목록에서 사라지고 softDeletePage·reindexSource(빈 텍스트)를 호출한다", async () => {
    const page = makePage({ id: "del-1", title: "지울 페이지" });
    vi.mocked(listPages).mockResolvedValue([page]);
    vi.mocked(softDeletePage).mockResolvedValue(undefined);

    render(<PageWorkspace pageId={null} />);
    await screen.findByText("지울 페이지");

    fireEvent.click(screen.getByRole("button", { name: "지울 페이지 삭제" }));

    expect(screen.queryByText("지울 페이지")).toBeNull();
    await waitFor(() =>
      expect(softDeletePage).toHaveBeenCalledWith(mockSupabase, "del-1"),
    );
    await waitFor(() =>
      expect(reindexSource).toHaveBeenCalledWith({
        sourceType: "page",
        sourceId: "del-1",
        text: "",
      }),
    );
  });

  it("삭제가 실패하면 목록에 되살리고 실패 메시지를 보여준다", async () => {
    const page = makePage({ id: "del-2", title: "롤백될 페이지" });
    vi.mocked(listPages).mockResolvedValue([page]);
    vi.mocked(softDeletePage).mockRejectedValue(new Error("fail"));

    render(<PageWorkspace pageId={null} />);
    await screen.findByText("롤백될 페이지");

    fireEvent.click(screen.getByRole("button", { name: "롤백될 페이지 삭제" }));
    expect(screen.queryByText("롤백될 페이지")).toBeNull();

    expect(await screen.findByText("롤백될 페이지")).not.toBeNull();
    expect(
      screen.getByText("페이지를 휴지통으로 보내지 못했습니다. 다시 시도해 주세요."),
    ).not.toBeNull();
  });
});

describe("PageWorkspace — 복제", () => {
  it("복제 버튼을 누르면 원본의 제목/본문/아이콘/부모/스키마를 복사해 createPage를 호출한다", async () => {
    const src = makePage({
      id: "src-1",
      title: "원본",
      icon: "📄",
      parentId: "parent-x",
      content: [{ type: "paragraph" }],
    });
    vi.mocked(listPages).mockResolvedValue([src]);
    vi.mocked(createPage).mockResolvedValue(makePage({ id: "copy-1" }));

    render(<PageWorkspace pageId={null} />);
    await screen.findByText("원본");

    fireEvent.click(screen.getByRole("button", { name: "원본 복제" }));

    await waitFor(() =>
      expect(createPage).toHaveBeenCalledWith(
        mockSupabase,
        {
          title: "원본 (사본)",
          content: src.content,
          icon: "📄",
          parentId: "parent-x",
          dbSchema: undefined,
        },
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pages/copy-1"));
  });
});

describe("PageWorkspace — 즐겨찾기", () => {
  it("즐겨찾기 토글 버튼을 누르면 즐겨찾기 섹션에 나타난다", async () => {
    vi.mocked(listPages).mockResolvedValue([
      makePage({ id: "fav-1", title: "즐찾할 페이지" }),
    ]);
    render(<PageWorkspace pageId={null} />);
    await screen.findByText("즐찾할 페이지");

    fireEvent.click(
      screen.getByRole("button", { name: "즐찾할 페이지 즐겨찾기" }),
    );

    await waitFor(() => expect(screen.getByText("즐겨찾기 (1)")).not.toBeNull());
  });
});
