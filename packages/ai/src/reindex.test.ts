import { describe, expect, it, vi } from "vitest";
import { reindexSource } from "./reindex";

describe("reindexSource", () => {
  it("/api/ai/embed에 sourceType/id/text를 POST한다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await reindexSource(
      { sourceType: "memo", sourceId: "m1", text: "내용" },
      { fetchImpl },
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/ai/embed");
    expect(JSON.parse(init.body)).toEqual({
      sourceType: "memo",
      sourceId: "m1",
      text: "내용",
    });
  });

  it("실패해도 throw하지 않는다(부가 기능, fire-and-forget)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    await expect(
      reindexSource({ sourceType: "todo", sourceId: "t1", text: "x" }, { fetchImpl }),
    ).resolves.toBeUndefined();
  });
});
