// 2026-07-24 : office-input - InputManager — 키보드·터치 단일 입력 추상화 레이어.
// 키보드 이벤트와 가상 D-pad 터치 이벤트를 동일한 InputAction으로 통합한다.

export type InputAction = "up" | "down" | "left" | "right" | "interact" | "menu" | "minimap" | "sound" | "management" | "help";

export class InputManager {
  private pressed = new Set<InputAction>();
  private justPressed = new Set<InputAction>();
  private consumed = new Set<InputAction>();
  private tapWorldPos: { x: number; y: number } | null = null;

  press(action: InputAction): void {
    this.pressed.add(action);
    if (!this.consumed.has(action)) this.justPressed.add(action);
  }

  release(action: InputAction): void {
    this.pressed.delete(action);
    this.consumed.delete(action);
  }

  // 포커스 상실(blur) 등으로 keyup을 못 받는 상황에서 모든 키 상태를 초기화한다.
  // 방향키를 누른 채 캔버스 포커스를 잃으면 keyup이 다른 요소로 가 pressed가 고착되는데,
  // 포커스 복귀 시 대장오리가 저절로 움직이는 걸 막는다(Phase 17 T1 포커스 제약).
  releaseAll(): void {
    this.pressed.clear();
    this.justPressed.clear();
    this.consumed.clear();
  }

  setTapWorld(x: number, y: number): void {
    this.tapWorldPos = { x, y };
  }

  lastTapWorld(): { x: number; y: number } | null {
    return this.tapWorldPos;
  }

  isPressed(action: InputAction): boolean {
    return this.pressed.has(action);
  }

  isJustPressed(action: InputAction): boolean {
    return this.justPressed.has(action);
  }

  consumeJustPressed(action: InputAction): boolean {
    if (this.justPressed.has(action)) {
      this.justPressed.delete(action);
      this.consumed.add(action);
      return true;
    }
    return false;
  }

  endFrame(): void {
    this.justPressed.clear();
    this.tapWorldPos = null;
  }

  // 키보드 이벤트를 InputAction으로 바인딩한다. 반환값은 언바인드 클린업 함수.
  bindKeyboard(el: HTMLElement): () => void {
    const KEY_MAP: Record<string, InputAction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      a: "left",
      s: "down",
      d: "right",
      W: "up",
      A: "left",
      S: "down",
      D: "right",
      e: "interact",
      E: "interact",
      Enter: "interact",
      Escape: "menu",
      m: "minimap",
      M: "minimap",
      n: "sound",
      N: "sound",
      Tab: "management",
      "?": "help",
    };

    const onDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key];
      if (action) {
        e.preventDefault();
        this.press(action);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.key];
      if (action) this.release(action);
    };

    // 포커스를 잃으면 눌린 키 상태를 전부 비운다(고착 방지).
    const onBlur = () => this.releaseAll();

    el.addEventListener("keydown", onDown);
    el.addEventListener("keyup", onUp);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("keydown", onDown);
      el.removeEventListener("keyup", onUp);
      el.removeEventListener("blur", onBlur);
    };
  }
}
