import { describe, it, expect, beforeEach } from "vitest";
import { InputManager } from "../office-input";

let mgr: InputManager;

beforeEach(() => {
  mgr = new InputManager();
});

describe("InputManager - press / isPressed", () => {
  it("reports pressed after press()", () => {
    mgr.press("up");
    expect(mgr.isPressed("up")).toBe(true);
  });

  it("reports not pressed before any press()", () => {
    expect(mgr.isPressed("down")).toBe(false);
  });

  it("clears pressed state after release()", () => {
    mgr.press("left");
    mgr.release("left");
    expect(mgr.isPressed("left")).toBe(false);
  });
});

describe("InputManager - consumeJustPressed", () => {
  it("returns true on first consume then false", () => {
    mgr.press("interact");
    expect(mgr.consumeJustPressed("interact")).toBe(true);
    expect(mgr.consumeJustPressed("interact")).toBe(false);
  });

  it("pressing again after consume makes it consumable once more", () => {
    mgr.press("interact");
    mgr.consumeJustPressed("interact");
    mgr.release("interact");
    mgr.press("interact");
    expect(mgr.consumeJustPressed("interact")).toBe(true);
  });
});

describe("InputManager - endFrame", () => {
  it("clears justPressed set each frame", () => {
    mgr.press("menu");
    mgr.endFrame();
    expect(mgr.isJustPressed("menu")).toBe(false);
  });

  it("does not clear pressed — key held across frames stays pressed", () => {
    mgr.press("right");
    mgr.endFrame();
    expect(mgr.isPressed("right")).toBe(true);
  });
});

describe("InputManager - tap world position", () => {
  it("returns null initially", () => {
    expect(mgr.lastTapWorld()).toBeNull();
  });

  it("stores position after setTapWorld", () => {
    mgr.setTapWorld(10, 20);
    expect(mgr.lastTapWorld()).toEqual({ x: 10, y: 20 });
  });

  it("clears position after endFrame", () => {
    mgr.setTapWorld(5, 5);
    mgr.endFrame();
    expect(mgr.lastTapWorld()).toBeNull();
  });
});
