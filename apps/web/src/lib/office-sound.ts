// 2026-07-26 : 오피스 - 사운드 - 실제녹음교체 (피드백 5-1)
// "일단 사운드가 이상해, 다른 실제 상용화된 제품이나, 무료 에셋에 있는 사운드를 가져와서 쓰도록해".
//
// 종전에는 외부 파일 없이 Web Audio 오실레이터로 전부 합성했다. 두 가지가 문제였다:
//   ① BGM이 **사인파 C장조 3화음을 끊김 없이 계속 울리는 드론**이었다. 사무실 소리가 아니라
//      의료기기 경고음에 가깝다. 이번에 걷어냈다 — 사무실은 원래 조용하다. 못 들어 본 소리로
//      바꾸느니 없애는 쪽이 낫다.
//   ② 발소리·타이핑이 사각파 삑 소리였다. 실제 녹음으로 교체했다.
//
// 자산: Kenney(kenney.nl) CC0 — Interface Sounds / RPG Audio. 원문 라이선스는
// `public/sounds/LICENSE.txt`에 그대로 넣어 뒀다. CC0라 표기 의무는 없지만 출처를 남기지 않으면
// 다음 사람이 라이선스를 다시 조사해야 한다.
//
// 파일 재생이 실패해도(네트워크·코덱) 오피스가 조용해지기만 하고 죽지 않는다 — 부가 기능이다.

const SFX_SRC = {
  typing: ["/sounds/typing.ogg"],
  interact: ["/sounds/interact.ogg"],
  doorOpen: ["/sounds/door-open.ogg"],
  doorClose: ["/sounds/door-close.ogg"],
  // 발소리는 두 개를 번갈아 쓴다. 같은 파일만 반복하면 기계적으로 들린다(왼발·오른발).
  footstep: ["/sounds/footstep-1.ogg", "/sounds/footstep-2.ogg"],
} as const;

type SfxName = keyof typeof SFX_SRC;

// 소리별 기본 음량. 발소리·타이핑은 자주 울리므로 낮게 잡는다 — 같은 음량이면 금세 거슬린다.
const SFX_VOLUME: Record<SfxName, number> = {
  typing: 0.18,
  interact: 0.45,
  doorOpen: 0.4,
  doorClose: 0.4,
  footstep: 0.22,
};

// 같은 소리가 겹쳐 울릴 수 있게 요소를 복제해 재생한다. 원본 요소를 재생하면 이전 재생이 끊긴다.
const POOL_SIZE = 3;

export class OfficeSoundManager {
  private pools = new Map<string, HTMLAudioElement[]>();
  private cursor = new Map<string, number>();
  private _muted = false;
  private loaded = false;
  // 발소리 좌/우 번갈기.
  private stepAlt = 0;

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    return this._muted;
  }

  // 첫 사용자 제스처 이후 호출한다(브라우저 자동재생 정책). 여러 번 불러도 한 번만 준비한다.
  private ensureLoaded(): void {
    if (this.loaded || typeof Audio === "undefined") return;
    this.loaded = true;
    for (const srcs of Object.values(SFX_SRC)) {
      for (const src of srcs) {
        const pool: HTMLAudioElement[] = [];
        for (let i = 0; i < POOL_SIZE; i++) {
          const el = new Audio(src);
          el.preload = "auto";
          pool.push(el);
        }
        this.pools.set(src, pool);
        this.cursor.set(src, 0);
      }
    }
  }

  private playSrc(src: string, volume: number): void {
    const pool = this.pools.get(src);
    if (!pool || pool.length === 0) return;
    const i = this.cursor.get(src) ?? 0;
    this.cursor.set(src, (i + 1) % pool.length);
    const el = pool[i];
    el.volume = Math.max(0, Math.min(1, volume));
    el.currentTime = 0;
    // play()는 Promise를 돌려주고 자동재생 차단 시 reject한다. 잡지 않으면 콘솔에 미처리 거부가 쌓인다.
    void el.play().catch(() => {
      // 재생 실패는 조용히 넘긴다 — 소리는 부가 기능이고, 실패해도 오피스는 그대로 동작해야 한다.
    });
  }

  private play(name: SfxName): void {
    if (this._muted) return;
    this.ensureLoaded();
    const srcs = SFX_SRC[name];
    const src =
      name === "footstep" ? srcs[this.stepAlt++ % srcs.length] : srcs[0];
    this.playSrc(src, SFX_VOLUME[name]);
  }

  playFootstep(): void {
    this.play("footstep");
  }

  playInteract(): void {
    this.play("interact");
  }

  playTyping(): void {
    this.play("typing");
  }

  playDoor(): void {
    this.play("doorOpen");
  }

  playDoorClose(): void {
    this.play("doorClose");
  }

  // BGM은 없앴다(위 주석 참조). 호출부를 한 번에 고치지 않아도 되도록 no-op으로 남긴다 —
  // 없는 메서드를 부르면 화면 전체가 죽지만, 소리가 안 나는 건 아무것도 망가뜨리지 않는다.
  startBgm(): void {
    /* 의도적 no-op: 드론 BGM 제거 */
  }

  stopBgm(): void {
    /* 의도적 no-op: 드론 BGM 제거 */
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      for (const el of pool) {
        el.pause();
        el.src = "";
      }
    }
    this.pools.clear();
    this.cursor.clear();
    this.loaded = false;
  }
}
