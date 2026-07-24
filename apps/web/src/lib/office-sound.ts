// 2026-07-24 : Phase H — Web Audio API 사운드 매니저
// 외부 오디오 파일 없음. OscillatorNode + GainNode 순수 절차적 생성.
// 브라우저 autoplay 정책 준수: 첫 사용자 제스처 이후 init() 호출.

export class OfficeSoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private _muted = false;
  private _bgmPlaying = false;

  // ---------------------------------------------------------------------------
  // 내부 초기화 — 첫 사용자 제스처 후에만 호출
  // ---------------------------------------------------------------------------
  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._muted ? 0 : 0.08;
      this.bgmGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._muted ? 0 : 0.15;
      this.sfxGain.connect(this.ctx.destination);
    }
    // suspended 상태는 사용자 제스처 맥락에서 재개
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  // ---------------------------------------------------------------------------
  // 공개 API
  // ---------------------------------------------------------------------------
  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.bgmGain) this.bgmGain.gain.value = this._muted ? 0 : 0.08;
    if (this.sfxGain) this.sfxGain.gain.value = this._muted ? 0 : 0.15;
    return this._muted;
  }

  // ---------------------------------------------------------------------------
  // BGM — C장조 3화음 패드 (C4·E4·G4), LFO 비브라토 + 로우패스
  // ---------------------------------------------------------------------------
  startBgm(): void {
    if (this._bgmPlaying) return;
    const ctx = this.init();
    if (!this.bgmGain) return;

    const freqs = [261.63, 329.63, 392.0]; // C4, E4, G4

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      // 부드러운 LFO 비브라토
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.2 + Math.random() * 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2; // ±2Hz 깊이
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      // 따뜻한 로우패스
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;

      osc.connect(filter);
      filter.connect(this.bgmGain);
      osc.start();
    }

    this._bgmPlaying = true;
  }

  stopBgm(): void {
    // 오실레이터는 살려두고 게인만 0으로 — 재시작 비용 절감
    if (this.bgmGain) this.bgmGain.gain.value = 0;
    this._bgmPlaying = false;
  }

  // ---------------------------------------------------------------------------
  // SFX: 발소리 — 짧은 스퀘어파 노이즈 버스트
  // ---------------------------------------------------------------------------
  playFootstep(): void {
    if (this._muted) return;
    const ctx = this.init();
    if (!this.sfxGain) return;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 150 + Math.random() * 100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // ---------------------------------------------------------------------------
  // SFX: 상호작용 (E키 / NPC 대화) — 두 음 짧은 상승 칩튠
  // ---------------------------------------------------------------------------
  playInteract(): void {
    if (this._muted) return;
    const ctx = this.init();
    if (!this.sfxGain) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);        // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08); // E5

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  // ---------------------------------------------------------------------------
  // SFX: 타이핑 — 매우 짧은 고음 클릭
  // ---------------------------------------------------------------------------
  playTyping(): void {
    if (this._muted) return;
    const ctx = this.init();
    if (!this.sfxGain) return;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 800 + Math.random() * 400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  }

  // ---------------------------------------------------------------------------
  // SFX: 문 — 저음 하강 덜컥 소리
  // ---------------------------------------------------------------------------
  playDoor(): void {
    if (this._muted) return;
    const ctx = this.init();
    if (!this.sfxGain) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  // ---------------------------------------------------------------------------
  // 정리
  // ---------------------------------------------------------------------------
  dispose(): void {
    this.ctx?.close();
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this._bgmPlaying = false;
  }
}
