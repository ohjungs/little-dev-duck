// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { BlockEditor } from "@/components/BlockEditor";

// 2026-08-02 : 테스트 - BlockEditor - jsdom 렌더 + 콜백 배선 계약 잠금
// 계약 정찰 리스크 1의 답: BlockNote(shadcn)는 jsdom에서 예외 없이 렌더된다(스모크로 먼저 확인 —
// 이 파일이 그 확정 버전이다). 에디터 인스턴스 내부 상호작용(실제 타이핑으로 onChange 발화)까지는
// jsdom+BlockNote 조합에서 안정적으로 재현하기 어려워(contenteditable 저수준 이벤트) 다루지 않는다 —
// 그 계층은 e2e(pages-workspace.spec.ts)가 실제 브라우저로 검증한다. 여기서는 **PageEditor가 기대하는
// 배선 계약**(onExportReady/onImportReady/onInsertReady가 함수로 넘어오는지, editable/초기 콘텐츠에
// 따라 예외 없이 렌더되는지)을 좁혀 잠근다.

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    storage: { from: vi.fn() },
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
  document.documentElement.classList.remove("dark");
});

describe("BlockEditor — 렌더", () => {
  it("빈 initialContent([])로 예외 없이 렌더된다(빈 배열은 BlockNote가 거부하므로 undefined로 치환)", () => {
    expect(() => render(<BlockEditor initialContent={[]} />)).not.toThrow();
  });

  it("배열 형태의 initialContent로 렌더된다", () => {
    const content = [
      {
        id: "b1",
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: "안녕", styles: {} }],
        children: [],
      },
    ];
    expect(() =>
      render(<BlockEditor initialContent={content} />),
    ).not.toThrow();
  });

  it("배열이 아닌 initialContent(null/undefined 등)도 예외 없이 렌더된다", () => {
    expect(() => render(<BlockEditor initialContent={null} />)).not.toThrow();
    expect(() =>
      render(<BlockEditor initialContent={undefined} />),
    ).not.toThrow();
  });

  it("editable=false(읽기 전용)로 렌더된다", () => {
    expect(() =>
      render(<BlockEditor initialContent={[]} editable={false} />),
    ).not.toThrow();
  });
});

describe("BlockEditor — 상위 노출 콜백 배선", () => {
  it("onExportReady에 Markdown 변환 함수를 넘긴다", async () => {
    const onExportReady = vi.fn();
    render(<BlockEditor initialContent={[]} onExportReady={onExportReady} />);
    await waitFor(() => expect(onExportReady).toHaveBeenCalled());
    expect(typeof onExportReady.mock.calls[0][0]).toBe("function");
  });

  it("onImportReady에 Markdown 파싱 함수를 넘긴다", async () => {
    const onImportReady = vi.fn();
    render(<BlockEditor initialContent={[]} onImportReady={onImportReady} />);
    await waitFor(() => expect(onImportReady).toHaveBeenCalled());
    expect(typeof onImportReady.mock.calls[0][0]).toBe("function");
  });

  it("onInsertReady에 블록 삽입 함수를 넘긴다", async () => {
    const onInsertReady = vi.fn();
    render(<BlockEditor initialContent={[]} onInsertReady={onInsertReady} />);
    await waitFor(() => expect(onInsertReady).toHaveBeenCalled());
    expect(typeof onInsertReady.mock.calls[0][0]).toBe("function");
  });

  it("콜백을 넘기지 않아도 예외 없이 렌더된다", () => {
    expect(() => render(<BlockEditor initialContent={[]} />)).not.toThrow();
  });
});
