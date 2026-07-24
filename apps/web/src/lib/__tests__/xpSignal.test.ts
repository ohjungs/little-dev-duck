import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  const et = new EventTarget();
  vi.stubGlobal("window", {
    dispatchEvent: et.dispatchEvent.bind(et),
    addEventListener: et.addEventListener.bind(et),
    removeEventListener: et.removeEventListener.bind(et),
  });
});

describe("emitXpChanged / onXpChanged", () => {
  it("handler is called when xp event is emitted", async () => {
    const { emitXpChanged, onXpChanged } = await import("../xpSignal");
    let count = 0;
    onXpChanged(() => { count++; });
    emitXpChanged();
    expect(count).toBe(1);
  });

  it("handler is called for each emission", async () => {
    const { emitXpChanged, onXpChanged } = await import("../xpSignal");
    let count = 0;
    onXpChanged(() => { count++; });
    emitXpChanged();
    emitXpChanged();
    expect(count).toBe(2);
  });

  it("unsubscribe stops handler from being called", async () => {
    const { emitXpChanged, onXpChanged } = await import("../xpSignal");
    let count = 0;
    const unsub = onXpChanged(() => { count++; });
    unsub();
    emitXpChanged();
    expect(count).toBe(0);
  });
});
