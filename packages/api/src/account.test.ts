import { describe, expect, it } from "vitest";
import { deleteAllMyData } from "./account";

const USER_ID = "44444444-4444-4444-8444-444444444444";

type FakeOpts = {
  files?: { name: string }[];
  rpcError?: string;
  listThrows?: boolean;
};

function fakeSupabase(opts: FakeOpts = {}) {
  const calls = { rpc: 0, removedPaths: null as string[] | null };
  return {
    supabase: {
      storage: {
        from: () => ({
          list: async () => {
            if (opts.listThrows) throw new Error("storage down");
            return { data: opts.files ?? [], error: null };
          },
          remove: async (paths: string[]) => {
            calls.removedPaths = paths;
            return { data: null, error: null };
          },
        }),
      },
      rpc: async () => {
        calls.rpc += 1;
        return { error: opts.rpcError ? { message: opts.rpcError } : null };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    calls,
  };
}

describe("deleteAllMyData", () => {
  it("본인 폴더 첨부를 제거하고 삭제 RPC를 호출한다", async () => {
    const { supabase, calls } = fakeSupabase({
      files: [{ name: "a.png" }, { name: "b.pdf" }],
    });
    await deleteAllMyData(supabase, USER_ID);
    expect(calls.removedPaths).toEqual([`${USER_ID}/a.png`, `${USER_ID}/b.pdf`]);
    expect(calls.rpc).toBe(1);
  });

  it("첨부가 없으면 remove를 건너뛰고 RPC만 호출한다", async () => {
    const { supabase, calls } = fakeSupabase({ files: [] });
    await deleteAllMyData(supabase, USER_ID);
    expect(calls.removedPaths).toBeNull();
    expect(calls.rpc).toBe(1);
  });

  it("스토리지 정리에 실패해도 DB 삭제(RPC)는 진행한다", async () => {
    const { supabase, calls } = fakeSupabase({ listThrows: true });
    await deleteAllMyData(supabase, USER_ID);
    expect(calls.rpc).toBe(1);
  });

  it("삭제 RPC 에러면 예외를 던진다", async () => {
    const { supabase } = fakeSupabase({ rpcError: "delete failed" });
    await expect(deleteAllMyData(supabase, USER_ID)).rejects.toThrow(
      "delete failed",
    );
  });
});
