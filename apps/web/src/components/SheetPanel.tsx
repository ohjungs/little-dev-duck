"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Table2 } from "lucide-react";
import {
  createSheet,
  getMyAccess,
  listSheets,
  loadSheetCells,
  saveCells,
  updateSheetMeta,
} from "@ldd/api";
import {
  UTF8_BOM,
  canUseFeature,
  cellKey,
  isValidSheetName,
  nextSheetName,
  parseDelimited,
  toCsv,
  type Cell,
  type Sheet,
  type SheetMeta,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { SheetGrid } from "@/components/SheetGrid";
import { computeAll, rowsToCells, sheetFileName, sheetToRows } from "@/lib/sheetIo";

// 2026-08-02 : 스프레드시트 - 화면 - 불러오기·저장 (SPEC-2026-08-02-spreadsheet-a1 T5)
//
// 격자(SheetGrid)는 저장을 모른다. 여기가 그 바깥이다 — 불러오기, **셀 단위 디바운스 저장**,
// 기능 토글 판정, 그리고 T8부터는 여러 시트 탭.
//
// 저장 시점(인계 문서가 다음 세션에 넘긴 결정): **셀 단위 upsert를 디바운스로 묶는다.**
// 셀 테이블을 고른 이유가 "한 글자에 문서 전체를 다시 쓰지 않기"이므로 셀 단위가 자연스럽지만,
// 확정할 때마다 왕복하면 연타에서 요청이 그만큼 늘어난다. 그래서 대기 중인 편집을 셀 키로
// 모아 두고(같은 셀은 마지막 것만 남는다) 한 번에 보낸다. PageEditor의 저장과 같은 간격을 쓴다.
const SAVE_DEBOUNCE_MS = 800;

/** 대기열 키 — 시트가 여럿이므로 좌표만으로는 다른 시트의 같은 칸과 겹친다. */
function pendKey(sheetId: string, cell: Cell): string {
  return `${sheetId}|${cellKey(cell.r, cell.c)}`;
}

export function SheetPanel({ pageId }: { pageId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<"loading" | "ready" | "off" | "error">("loading");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // 시트별 셀. **모든 시트를 들고 있는다** — 수식이 다른 시트를 참조할 수 있어서다(AC-7).
  // 문서당 시트 상한이 50이라(스펙 D-1) 전부 들고 있어도 감당된다.
  const [cellsBySheet, setCellsBySheet] = useState<Record<string, Cell[]>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useRef(new Map<string, { sheetId: string; cell: Cell }>());
  // 아직 저장되지 않은 시트 메타. 셀과 달리 통째로 쓰므로 시트마다 마지막 것 하나면 된다.
  const pendingMeta = useRef(new Map<string, SheetMeta>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 언마운트 정리 함수는 처음 만들어진 flush를 붙들기 때문에, 최신 flush를 ref로 건네준다.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const sheet = sheets.find((s) => s.id === activeId) ?? null;
  const cells = activeId ? (cellsBySheet[activeId] ?? []) : [];

  // 지금 시트가 참조할 수 있는 다른 시트들. 이름으로 찾으므로 이름이 키다.
  const otherSheets = useMemo(() => {
    const m = new Map<string, readonly Cell[]>();
    for (const s of sheets) {
      if (s.id === activeId) continue;
      m.set(s.name, cellsBySheet[s.id] ?? []);
    }
    return m;
  }, [sheets, activeId, cellsBySheet]);

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
        const list = await listSheets(supabase, pageId);
        if (!alive) return;
        if (list.length === 0) {
          setPhase("ready");
          return;
        }
        const loaded: Record<string, Cell[]> = {};
        for (const s of list) {
          loaded[s.id] = await loadSheetCells(supabase, s.id);
          if (!alive) return;
        }
        setSheets(list);
        setActiveId(list[0].id);
        setCellsBySheet(loaded);
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
    const batch = [...pending.current.values()];
    const metas = [...pendingMeta.current.entries()];
    if (batch.length === 0 && metas.length === 0) return;
    pending.current.clear();
    pendingMeta.current.clear();

    // 시트별로 묶어 한 번씩 보낸다.
    const bySheet = new Map<string, Cell[]>();
    for (const item of batch) {
      const list = bySheet.get(item.sheetId) ?? [];
      list.push(item.cell);
      bySheet.set(item.sheetId, list);
    }

    try {
      // 메타를 먼저 쓴다 — 셀이 가리키는 서식 인덱스가 팔레트에 없는 순간을 만들지 않기 위해서다
      // (그 사이 다른 기기가 읽으면 서식 없는 셀로 보인다).
      for (const [id, meta] of metas) await updateSheetMeta(supabase, id, meta);
      for (const [id, list] of bySheet) await saveCells(supabase, id, list);
      setSaveError(null);
    } catch {
      // 실패한 편집을 **버리지 않는다.** 다시 대기열에 넣어 다음 저장에 함께 실린다
      // (새로 고친 셀이 있으면 그쪽이 이긴다 — 나중 것이 최신이다).
      for (const [id, meta] of metas) {
        if (!pendingMeta.current.has(id)) pendingMeta.current.set(id, meta);
      }
      for (const item of batch) {
        const key = pendKey(item.sheetId, item.cell);
        if (!pending.current.has(key)) pending.current.set(key, item);
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

  function schedule(): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flushRef.current();
    }, SAVE_DEBOUNCE_MS);
  }

  function handleCommit(next: Cell[]): void {
    const id = activeId;
    if (!id || next.length === 0) return;
    setCellsBySheet((prev) => {
      const touched = new Set(next.map((c) => cellKey(c.r, c.c)));
      const rest = (prev[id] ?? []).filter((c) => !touched.has(cellKey(c.r, c.c)));
      const kept = next.filter((c) => !(c.v === null && c.f === null && c.s === null));
      return { ...prev, [id]: [...rest, ...kept] };
    });
    for (const cell of next) pending.current.set(pendKey(id, cell), { sheetId: id, cell });
    schedule();
  }

  // 시트 메타(서식 팔레트·열 너비·틀 고정)는 셀과 **같은 디바운스**를 탄다. 열을 끄는 동안
  // mousemove마다 저장하면 왕복이 수십 번 나기 때문이다. 화면은 바로 새 meta로 그려지고
  // 서버 저장만 늦게 따라간다.
  function handleMetaChange(next: SheetMeta): void {
    const id = activeId;
    if (!id) return;
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, meta: next } : s)));
    pendingMeta.current.set(id, next);
    schedule();
  }

  // ── CSV 입출력 (T9 / AC-18) ────────────────────────────────────────────────
  // 엑셀은 BOM이 없으면 CSV의 한글을 깨뜨린다. 이스케이프는 이 저장소의 공용 toCsv가 하는데,
  // 거기에는 **수식 인젝션 방어**(=,+,@로 시작하는 값 앞에 작은따옴표)가 들어 있다 —
  // 내보낸 파일을 엑셀에서 열었을 때 우리 값이 남의 수식으로 실행되지 않게 하는 장치다.
  function handleExportCsv(): void {
    if (!sheet) return;
    const rows = sheetToRows(sheet.name, cells, sheet.meta, otherSheets);
    const blob = new Blob([UTF8_BOM + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sheetFileName(document.title, sheet.name, "csv");
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 가져오기는 **새 시트를 만든다.** 지금 시트를 덮으면 되돌릴 수 없는 조작이 되고
   * (CLAUDE.md 5), 확인 대화를 띄우는 것보다 새 탭으로 들어오는 편이 엑셀의 동작과도 가깝다.
   */
  async function handleImportCsv(file: File): Promise<void> {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseDelimited(text, ",");
      const imported = rowsToCells(rows);
      const base = file.name.replace(/\.[^.]+$/, "");
      const created = await createSheet(supabase, {
        pageId,
        // 파일 이름을 시트 이름으로 쓰되, 규칙에 어긋나거나 겹치면 Sheet2 식으로 물러난다.
        name: isValidSheetName(base) && !sheets.some((s) => s.name === base)
          ? base
          : nextSheetName(sheets.map((s) => s.name)),
        position: sheets.length,
      });
      setSheets((prev) => [...prev, created]);
      setCellsBySheet((prev) => ({ ...prev, [created.id]: imported }));
      setActiveId(created.id);
      for (const cell of imported) {
        pending.current.set(pendKey(created.id, cell), { sheetId: created.id, cell });
      }
      schedule();
    } catch {
      setSaveError("CSV를 가져오지 못했어요. 파일을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  // ── 엑셀(xlsx) 입출력 (T9 / AC-16·17) ──────────────────────────────────────
  // SheetJS는 수백 KB라 **동적으로** 부른다. 시트를 안 쓰는 사람이 그 값을 치르지 않게.
  async function handleExportXlsx(): Promise<void> {
    setBusy(true);
    try {
      const { buildXlsx } = await import("@/lib/sheetXlsx");
      const inputs = sheets.map((s) => ({
        name: s.name,
        cells: cellsBySheet[s.id] ?? [],
        meta: s.meta,
      }));
      // 계산은 한 번만 한다 — 워크북 전체를 한 번에 세고 그 결과를 파일에 함께 싣는다.
      const computed = computeAll(inputs);
      const bytes = buildXlsx(inputs, computed);
      const blob = new Blob([bytes as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sheetFileName(document.title, sheets[0]?.name ?? "sheet", "xlsx");
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSaveError("엑셀 파일을 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  /** 가져오기는 파일 안의 시트마다 **새 시트**를 만든다(CSV와 같은 이유로 덮지 않는다). */
  async function handleImportXlsx(file: File): Promise<void> {
    setBusy(true);
    try {
      const { readXlsx } = await import("@/lib/sheetXlsx");
      const result = readXlsx(await file.arrayBuffer());

      const used = sheets.map((s) => s.name);
      let lastId: string | null = null;
      for (const [i, incoming] of result.sheets.entries()) {
        const name =
          isValidSheetName(incoming.name) && !used.includes(incoming.name)
            ? incoming.name
            : nextSheetName(used);
        used.push(name);
        const created = await createSheet(supabase, {
          pageId,
          name,
          position: sheets.length + i,
        });
        setSheets((prev) => [...prev, created]);
        setCellsBySheet((prev) => ({ ...prev, [created.id]: incoming.cells }));
        for (const cell of incoming.cells) {
          pending.current.set(pendKey(created.id, cell), { sheetId: created.id, cell });
        }
        lastId = created.id;
      }
      if (lastId) setActiveId(lastId);
      schedule();

      // **무엇을 잃었는지 알린다**(AC-16). 조용히 버리면 사용자는 파일이 온전히 들어온 줄 안다.
      const notes: string[] = [];
      if (result.lost.formulas > 0) {
        notes.push(`읽지 못한 수식 ${result.lost.formulas}개는 값으로 들어왔어요`);
      }
      if (result.lost.macros) notes.push("매크로는 가져오지 않았어요");
      notes.push("차트·이미지·피벗 테이블은 가져오지 않아요");
      setSaveError(notes.join(". ") + ".");
    } catch {
      setSaveError("엑셀 파일을 가져오지 못했어요. 파일을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSheet(): Promise<void> {
    setBusy(true);
    try {
      const created = await createSheet(supabase, {
        pageId,
        // 이름은 core가 정한다(Sheet1, Sheet2...). 같은 문서 안에서 유일해야 수식이 가리킬 수 있다.
        name: nextSheetName(sheets.map((s) => s.name)),
        position: sheets.length,
      });
      setSheets((prev) => [...prev, created]);
      setCellsBySheet((prev) => ({ ...prev, [created.id]: [] }));
      setActiveId(created.id);
    } catch {
      setSaveError("시트를 만들지 못했어요.");
    } finally {
      setBusy(false);
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
          onClick={() => void handleAddSheet()}
          disabled={busy}
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
      <SheetGrid
        sheet={sheet}
        cells={cells}
        otherSheets={otherSheets}
        onCellsCommit={handleCommit}
        onMetaChange={handleMetaChange}
      />
      <div role="tablist" aria-label="시트 탭" className="flex items-center gap-1 px-4 pt-2">
        {sheets.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            onClick={() => setActiveId(s.id)}
            className={`rounded-t border-b-2 px-3 py-1 text-xs transition-colors ${
              s.id === activeId
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {s.name}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          CSV 내보내기
        </button>
        <label className="cursor-pointer rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          CSV 가져오기
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV 가져오기"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // 같은 파일을 다시 고를 수 있게 값을 비운다(안 그러면 change가 안 난다).
              e.target.value = "";
              if (file) void handleImportCsv(file);
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void handleExportXlsx()}
          disabled={busy}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
        >
          엑셀 내보내기
        </button>
        <label className="cursor-pointer rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          엑셀 가져오기
          <input
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="엑셀 가져오기"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleImportXlsx(file);
            }}
          />
        </label>
        <button
          type="button"
          aria-label="시트 추가"
          onClick={() => void handleAddSheet()}
          disabled={busy}
          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
