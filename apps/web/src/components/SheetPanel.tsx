"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import {
  createSheet,
  getMyAccess,
  listSheets,
  loadSheetCells,
  saveCells,
} from "@ldd/api";
import { canUseFeature, cellKey, type Cell, type Sheet } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { SheetGrid } from "@/components/SheetGrid";

// 2026-08-02 : 스프레드시트 - 화면 - 불러오기·저장 (SPEC-2026-08-02-spreadsheet-a1 T5)
//
// 격자(SheetGrid)는 저장을 모른다. 여기가 그 바깥이다 — 불러오기, **셀 단위 디바운스 저장**,
// 기능 토글 판정.
//
// 저장 시점(인계 문서가 다음 세션에 넘긴 결정): **셀 단위 upsert를 디바운스로 묶는다.**
// 셀 테이블을 고른 이유가 "한 글자에 문서 전체를 다시 쓰지 않기"이므로 셀 단위가 자연스럽지만,
// 확정할 때마다 왕복하면 연타에서 요청이 그만큼 늘어난다. 그래서 대기 중인 편집을 셀 키로
// 모아 두고(같은 셀은 마지막 것만 남는다) 한 번에 보낸다. PageEditor의 저장과 같은 간격을 쓴다.
const SAVE_DEBOUNCE_MS = 800;

export function SheetPanel({ pageId }: { pageId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<"loading" | "ready" | "off" | "error">("loading");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // 아직 저장되지 않은 셀. 키가 셀 좌표라 같은 셀을 연달아 고치면 마지막 것만 남는다.
  const pending = useRef(new Map<string, Cell>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetId = useRef<string | null>(null);
  // 언마운트 정리 함수는 처음 만들어진 flush를 붙들기 때문에, 최신 flush를 ref로 건네준다.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const access = await getMyAccess(supabase);
        if (!alive) return;
        // 화면과 데이터 접근이 **같은 함수**로 판정한다(core canUseFeature).
        if (
          !canUseFeature(
            { role: access.role, disabledFeatures: access.disabledFeatures },
            "sheet",
          )
        ) {
          setPhase("off");
          return;
        }
        const sheets = await listSheets(supabase, pageId);
        if (!alive) return;
        const first = sheets[0] ?? null;
        if (!first) {
          setPhase("ready");
          return;
        }
        const loaded = await loadSheetCells(supabase, first.id);
        if (!alive) return;
        sheetId.current = first.id;
        setSheet(first);
        setCells(loaded);
        setPhase("ready");
      } catch {
        if (alive) setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, pageId]);

  async function flush(): Promise<void> {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const id = sheetId.current;
    const batch = [...pending.current.values()];
    if (!id || batch.length === 0) return;
    pending.current.clear();
    try {
      await saveCells(supabase, id, batch);
      setSaveError(null);
    } catch {
      // 실패한 편집을 **버리지 않는다.** 다시 대기열에 넣어 다음 저장에 함께 실린다
      // (새로 고친 셀이 있으면 그쪽이 이긴다 — 나중 것이 최신이다).
      for (const cell of batch) {
        const key = cellKey(cell.r, cell.c);
        if (!pending.current.has(key)) pending.current.set(key, cell);
      }
      setSaveError("저장하지 못했어요. 잠시 뒤 다시 시도할게요.");
    }
  }

  // ref 갱신은 렌더 중이 아니라 렌더 뒤에 한다(렌더 중 ref 접근은 React 규칙 위반이고, 실제로도
  // 되돌려지는 렌더에서 최신이 아닌 flush가 남을 수 있다). 의존성 배열이 없으니 매 렌더 뒤 최신이다.
  useEffect(() => {
    flushRef.current = flush;
  });

  // 화면을 떠나기 전에 대기 중인 편집을 흘려보낸다. 이게 없으면 마지막 편집이 **조용히** 사라진다
  // (사용자는 확정까지 했으므로 저장된 줄 안다).
  useEffect(() => {
    return () => {
      void flushRef.current();
    };
  }, []);

  function handleCommit(cell: Cell): void {
    setCells((prev) => {
      const rest = prev.filter((c) => !(c.r === cell.r && c.c === cell.c));
      const empty = cell.v === null && cell.f === null && cell.s === null;
      return empty ? rest : [...rest, cell];
    });
    pending.current.set(cellKey(cell.r, cell.c), cell);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flushRef.current();
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleCreate(): Promise<void> {
    setCreating(true);
    try {
      const created = await createSheet(supabase, { pageId, name: "Sheet1" });
      sheetId.current = created.id;
      setSheet(created);
      setCells([]);
    } catch {
      setSaveError("스프레드시트를 만들지 못했어요.");
    } finally {
      setCreating(false);
    }
  }

  if (phase === "loading") return null;

  if (phase === "off") {
    // 시트가 없는 페이지에서까지 "꺼져 있다"고 알릴 이유는 없다 — 켜져 있어도 안 보이는 자리다.
    return (
      <p role="status" className="mt-6 px-4 text-sm text-muted-foreground">
        스프레드시트 기능이 꺼져 있어요. 관리자에게 문의해 주세요.
      </p>
    );
  }

  if (phase === "error") {
    return (
      <p role="alert" className="mt-6 px-4 text-sm text-destructive">
        스프레드시트를 불러오지 못했어요.
      </p>
    );
  }

  if (!sheet) {
    return (
      <div className="mt-6 px-4">
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
        >
          <Table2 className="size-3.5" /> 스프레드시트 추가
        </button>
      </div>
    );
  }

  return (
    <div>
      {saveError && (
        <p role="alert" className="px-4 pt-4 text-sm text-destructive">
          {saveError}
        </p>
      )}
      <SheetGrid sheet={sheet} cells={cells} onCellCommit={handleCommit} />
    </div>
  );
}
