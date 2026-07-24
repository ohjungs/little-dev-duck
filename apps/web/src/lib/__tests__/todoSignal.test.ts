import { describe, it, expect, beforeEach, vi } from "vitest";

// todoSignal holds module-level state (lastTally). Re-import fresh each test
// by resetting modules so the replay cache starts null.
beforeEach(() => {
  vi.resetModules();
  // Node 18+ has EventTarget globally; build a minimal window stub that
  // delegates to it so dispatchEvent / addEventListener work correctly.
  const et = new EventTarget();
  vi.stubGlobal("window", {
    dispatchEvent: et.dispatchEvent.bind(et),
    addEventListener: et.addEventListener.bind(et),
    removeEventListener: et.removeEventListener.bind(et),
  });
});

describe("emitTodosChanged / onTodosChanged", () => {
  it("handler receives the tally on the same tick", async () => {
    const { emitTodosChanged, onTodosChanged } = await import("../todoSignal");
    const tally = { total: 3, done: 1, } as const;
    const received: unknown[] = [];
    onTodosChanged((t) => received.push(t));
    emitTodosChanged(tally);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(tally);
  });

  it("replay: subscriber gets lastTally immediately if emit happened first", async () => {
    const { emitTodosChanged, onTodosChanged } = await import("../todoSignal");
    const tally = { total: 5, done: 5, } as const;
    emitTodosChanged(tally);
    const received: unknown[] = [];
    onTodosChanged((t) => received.push(t));
    // The subscriber was registered after emit — replay must deliver immediately.
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(tally);
  });

  it("unsubscribe stops future deliveries", async () => {
    const { emitTodosChanged, onTodosChanged } = await import("../todoSignal");
    const received: unknown[] = [];
    const unsub = onTodosChanged((t) => received.push(t));
    unsub();
    emitTodosChanged({ total: 1, done: 0, } as const);
    // Replay would have fired if lastTally existed before subscribe — but it
    // doesn't (fresh module). The event after unsub must also not be received.
    expect(received).toHaveLength(0);
  });
});
