import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OfficeSoundManager } from "../office-sound";

// 2026-07-26 : 오피스 - 사운드 - 실제녹음교체 (피드백 5-1)
// 소리 자체가 좋은지는 코드로 확인할 수 없다(들어봐야 안다). 여기서 잠그는 건 그 아래 계약이다:
//   · 음소거하면 정말 한 번도 재생하지 않는다
//   · 발소리가 같은 파일만 반복하지 않는다(기계적으로 들리는 걸 막는 장치가 실제로 동작하는가)
//   · 재생이 실패해도 화면이 죽지 않는다
//   · 없앤 BGM이 조용히 되살아나지 않는다

type FakeAudio = {
  src: string;
  volume: number;
  currentTime: number;
  preload: string;
  play: () => Promise<void>;
  pause: () => void;
};

let created: FakeAudio[] = [];
let played: { src: string; volume: number }[] = [];
let playRejects = false;

beforeEach(() => {
  created = [];
  played = [];
  playRejects = false;
  vi.stubGlobal(
    "Audio",
    class {
      src: string;
      volume = 1;
      currentTime = 0;
      preload = "";
      constructor(src: string) {
        this.src = src;
        created.push(this as unknown as FakeAudio);
      }
      play() {
        if (playRejects) return Promise.reject(new Error("autoplay blocked"));
        played.push({ src: this.src, volume: this.volume });
        return Promise.resolve();
      }
      pause() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OfficeSoundManager", () => {
  it("음소거 상태에서는 한 번도 재생하지 않는다", () => {
    const m = new OfficeSoundManager();
    expect(m.toggleMute()).toBe(true);
    m.playFootstep();
    m.playTyping();
    m.playInteract();
    m.playDoor();
    expect(played).toHaveLength(0);
  });

  it("음소거를 풀면 다시 재생한다", () => {
    const m = new OfficeSoundManager();
    m.toggleMute();
    m.toggleMute();
    m.playTyping();
    expect(played).toHaveLength(1);
  });

  it("발소리가 같은 파일만 반복되지 않는다(왼발·오른발)", () => {
    const m = new OfficeSoundManager();
    for (let i = 0; i < 6; i++) m.playFootstep();
    expect(new Set(played.map((p) => p.src)).size).toBeGreaterThan(1);
  });

  it("자주 울리는 소리는 더 작게 낸다(발소리·타이핑 < 상호작용)", () => {
    const m = new OfficeSoundManager();
    m.playTyping();
    m.playInteract();
    const typing = played.find((p) => p.src.includes("typing"))!;
    const interact = played.find((p) => p.src.includes("interact"))!;
    expect(typing.volume).toBeLessThan(interact.volume);
  });

  it("재생이 거부돼도 예외가 새지 않는다(자동재생 차단 상황)", () => {
    playRejects = true;
    const m = new OfficeSoundManager();
    expect(() => m.playFootstep()).not.toThrow();
  });

  it("연속 재생이 서로를 끊지 않도록 요소를 여러 개 둔다", () => {
    const m = new OfficeSoundManager();
    m.playTyping();
    const typingEls = created.filter((a) => a.src.includes("typing"));
    expect(typingEls.length).toBeGreaterThan(1);
  });

  it("BGM은 아무 소리도 내지 않는다(드론 제거가 유지되는지)", () => {
    const m = new OfficeSoundManager();
    m.startBgm();
    expect(played).toHaveLength(0);
    expect(() => m.stopBgm()).not.toThrow();
  });

  it("dispose 뒤에도 호출이 예외를 던지지 않는다", () => {
    const m = new OfficeSoundManager();
    m.playTyping();
    m.dispose();
    expect(() => m.playTyping()).not.toThrow();
  });
});
