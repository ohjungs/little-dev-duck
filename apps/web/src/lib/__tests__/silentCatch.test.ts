import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findSilentCatches } from "../silentCatch";

// 규칙 자체가 맞게 동작하는지 먼저 잠근다(가짜 통과·헛경보 양쪽).
describe("findSilentCatches", () => {
  it("알리지도 설명하지도 않는 catch를 잡는다", () => {
    const src = `try { a(); } catch { rollback(); }`;
    expect(findSilentCatches(src)).toHaveLength(1);
  });

  it("사용자에게 알리면 통과한다", () => {
    const src = `try { a(); } catch { setActionError("실패했어요."); }`;
    expect(findSilentCatches(src)).toHaveLength(0);
  });

  it("왜 삼키는지 적어두면 통과한다", () => {
    const src = `try { a(); } catch { /* 부가 기능이라 무시 */ }`;
    expect(findSilentCatches(src)).toHaveLength(0);
  });

  it("catch 안에 중첩 블록이 있어도 본문 범위를 정확히 잡는다", () => {
    // 정규식으로 첫 '}'까지 자르면 여기서 틀린다 — if 블록이 먼저 닫히기 때문.
    const src = `try { a(); } catch { if (x) { b(); } }`;
    expect(findSilentCatches(src)).toHaveLength(1);
    const informed = `try { a(); } catch { if (x) { setError("e"); } }`;
    expect(findSilentCatches(informed)).toHaveLength(0);
  });

  it("여러 catch를 모두 본다", () => {
    const src = `try{a()}catch{x()} try{b()}catch{y()}`;
    expect(findSilentCatches(src)).toHaveLength(2);
  });

  it("catch (e) 형태도 본다", () => {
    expect(findSilentCatches(`try{a()}catch (e) { x(e); }`)).toHaveLength(1);
  });

  it("빈 소스·catch 없는 소스에서 죽지 않는다", () => {
    expect(findSilentCatches("")).toEqual([]);
    expect(findSilentCatches("const a = 1;")).toEqual([]);
  });
});

const SRC = path.join(__dirname, "..", "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("웹 소스 전체", () => {
  it("오류를 삼키는 곳은 사용자에게 알리거나 사유를 남긴다", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      for (const hit of findSilentCatches(readFileSync(file, "utf-8"))) {
        offenders.push(
          `${path.relative(SRC, file).replace(/\\/g, "/")}:${hit.line}  ${hit.body}`,
        );
      }
    }
    // 실패하면 둘 중 하나를 하면 된다: 사용자에게 알리거나, 왜 삼키는지 주석으로 남기거나.
    expect(offenders).toEqual([]);
  });
});
