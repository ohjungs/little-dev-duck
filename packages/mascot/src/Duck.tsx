"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isQuietNow, type DuckMood } from "@ldd/core";
import { pickClickPhrase, pickIdlePhrase, pickPhrase } from "./phrases";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// 2026-07-25 : 오리 렌더링 - 픽셀아트 스프라이트(ducky_2_spritesheet.png)
// 49MB 3D GLB → SVG → 픽셀 스프라이트로 진화. 배포 웹 origin 루트의 /ducky_2_spritesheet.png
// (192x128, 6열x4행, 32x32 프레임, 행0=down/1=left/2=right/3=up)를 CSS 스프라이트 애니메이션으로
// 렌더. 4x 정수 스케일 + image-rendering:pixelated로 선명한 픽셀아트. 대사·기분·유휴·방해금지·클릭
// 로직은 보존. 기분: happy=빠른 걸음+통통, sad=느림+기울임, neutral=보통. 클릭=폴짝(꽥) + 말풍선.

const SPRITE_URL = "/ducky_2_spritesheet.png";
const SPEECH_BUBBLE_DURATION_MS = 2000;
const HOP_MS = 420;

const IDLE_MIN_MS = 12_000;
const IDLE_MAX_MS = 24_000;

const MOOD_LABEL: Record<DuckMood, string> = {
  happy: "기분 좋음",
  sad: "시무룩함",
  neutral: "평온함",
};

export interface DuckProps {
  height?: number;
  mood?: DuckMood;
  // true가 되는 순간 짧은 레벨업 축하 연출(폴짝)을 재생한다. 기본 false(하위호환).
  celebrate?: boolean;
  // Phase 12 T2 방해금지(DND). 이 시간대(로컬)엔 유휴 혼잣말을 억제한다(밤엔 오리도 잔다). null=끔.
  quietHours?: { start: number; end: number } | null;
  // 2026-07-26 (피드백 1-3): 오리가 먼저 거는 말. 값이 바뀌면 그 문장을 말풍선에 띄운다.
  // 문장은 호출부가 규칙으로 만든다(LLM 아님) — 여기는 표시만 맡는다.
  say?: string | null;
}

export function Duck({
  height = 220,
  mood = "neutral",
  celebrate = false,
  quietHours = null,
  say = null,
}: DuckProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clickCountRef = useRef(0);
  const [phrase, setPhrase] = useState(() => pickPhrase(0));
  const [showBubble, setShowBubble] = useState(false);
  const [hop, setHop] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionRef = useRef(0);
  const quietHoursRef = useRef(quietHours);
  quietHoursRef.current = quietHours;

  const speak = (next: string) => {
    setPhrase(next);
    setShowBubble(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => setShowBubble(false),
      SPEECH_BUBBLE_DURATION_MS,
    );
  };

  const handleGreet = () => {
    speak(pickClickPhrase(clickCountRef.current, mood));
    clickCountRef.current += 1;
    lastInteractionRef.current = Date.now();
    if (!reducedMotion) {
      setHop(true);
      if (hopTimer.current) clearTimeout(hopTimer.current);
      hopTimer.current = setTimeout(() => setHop(false), HOP_MS);
    }
  };

  // T2 자율 행동: 일정 시간 상호작용이 없으면 mood에 맞는 혼잣말을 스스로 띄운다.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleIdle = () => {
      const wait = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
      timer = setTimeout(() => {
        const idleFor = Date.now() - lastInteractionRef.current;
        const q = quietHoursRef.current;
        const quiet = q
          ? isQuietNow({ hour: new Date().getHours(), weekday: new Date().getDay() }, q)
          : false;
        if (idleFor >= IDLE_MIN_MS && !quiet) {
          speak(pickIdlePhrase(mood));
        }
        scheduleIdle();
      }, wait);
    };
    scheduleIdle();
    return () => clearTimeout(timer);
    // mood가 바뀌면 다음 유휴 대사부터 새 mood를 반영하도록 재스케줄한다.
  }, [mood]);

  // 자율 발화(피드백 1-3). 값이 새로 들어오면 그 문장을 띄우고, 유휴 혼잣말과 겹치지 않게
  // 마지막 상호작용 시각을 갱신한다 — 말을 건 직후에 혼잣말이 덮어쓰면 사용자가 못 읽는다.
  useEffect(() => {
    if (!say) return;
    speak(say);
    lastInteractionRef.current = Date.now();
    // say만 의존한다. speak는 렌더마다 새로 만들어지지만 하는 일이 같고, 의존성에 넣으면
    // 매 렌더마다 같은 문장을 다시 말한다.
  }, [say]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleGreet();
    }
  };

  const walkClass = reducedMotion ? "" : `ldd-duck-sprite--${mood}`;
  const hopClass = hop ? "ldd-duck-hop--active" : "";
  const celebrateClass = celebrate && !reducedMotion ? "ldd-duck-hop--celebrate" : "";

  return (
    <div
      style={{ height, width: "100%" }}
      data-testid="duck-widget"
      role="img"
      aria-label={`오리 상태: ${MOOD_LABEL[mood]}`}
      className="ldd-duck-stage"
    >
      <style>{DUCK_CSS}</style>

      {showBubble && (
        <div className="ldd-duck-bubble" aria-live="polite">
          {phrase}
        </div>
      )}

      <button
        type="button"
        onClick={handleGreet}
        onKeyDown={onKeyDown}
        aria-label="오리 쓰다듬기"
        className="ldd-duck-btn"
      >
        <span className={`ldd-duck-hop ${hopClass} ${celebrateClass}`}>
          <span className={`ldd-duck-sprite ${walkClass}`} />
          <span className="ldd-duck-floor" />
        </span>
      </button>
    </div>
  );
}

// 스타일은 컴포넌트에 인라인해 별도 CSS 파일/빌드 설정 없이 어디서든 동작하게 한다(패키지 자기완결).
const DUCK_CSS = `
.ldd-duck-stage{position:relative;display:flex;align-items:center;justify-content:center;}
.ldd-duck-btn{background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;outline:none;}
.ldd-duck-btn:focus-visible{outline:2px solid var(--ring,#ca8a04);outline-offset:4px;border-radius:16px;}
.ldd-duck-hop{position:relative;display:inline-flex;flex-direction:column;align-items:center;transition:transform .12s ease;}
.ldd-duck-sprite{
  width:128px;height:128px;
  background-image:url(${SPRITE_URL});
  background-repeat:no-repeat;
  background-size:768px 512px;      /* 4x: 시트 192x128 -> 768x512 */
  background-position:0 0;           /* 행0 = down(정면) */
  image-rendering:pixelated;
  image-rendering:crisp-edges;
}
.ldd-duck-floor{width:76px;height:9px;margin-top:-6px;border-radius:50%;background:rgba(0,0,0,.12);}

/* 시트 레이아웃(실측): row0=idle 2프레임, row1=걷기 6프레임, 전부 우측면 뷰. 4x 스케일이라 행=128px 단위. */
/* neutral: row0 2프레임 잔잔한 idle */
.ldd-duck-sprite--neutral{background-position-y:0;animation:lddIdle 1.3s steps(2) infinite;}
/* happy: row1 6프레임 신나는 뒤뚱걸음 */
.ldd-duck-sprite--happy{background-position-y:-128px;animation:lddWaddle .7s steps(6) infinite;}
/* sad: 정지 프레임 + 기울임(아래 hop 래퍼) */
.ldd-duck-sprite--sad{background-position:0 0;}
.ldd-duck-hop:has(.ldd-duck-sprite--happy){animation:lddBounce 1.4s ease-in-out infinite;}
.ldd-duck-hop:has(.ldd-duck-sprite--sad){transform:rotate(-5deg);}

/* 클릭 폴짝(꽥) / 레벨업 축하 */
.ldd-duck-hop--active{animation:lddHop .42s ease !important;}
.ldd-duck-hop--celebrate{animation:lddCelebrate .7s ease !important;}

@keyframes lddIdle{from{background-position-x:0}to{background-position-x:-256px}}
@keyframes lddWaddle{from{background-position-x:0}to{background-position-x:-768px}}
@keyframes lddBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes lddHop{0%{transform:translateY(0) scale(1,1)}30%{transform:translateY(-18px) scale(.92,1.1)}55%{transform:translateY(0) scale(1.1,.9)}100%{transform:translateY(0) scale(1,1)}}
@keyframes lddCelebrate{0%{transform:translateY(0) rotate(0)}25%{transform:translateY(-26px) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}75%{transform:translateY(-14px) rotate(-4deg)}100%{transform:translateY(0) rotate(0)}}

.ldd-duck-bubble{position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:2;
  background:var(--ldd-color-bg,#F6EFDD);color:var(--ldd-color-text,#352116);
  border:1px solid var(--ldd-color-accent,#A99C65);border-radius:12px;padding:.4rem .75rem;
  font-size:.85rem;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12);pointer-events:none;}

@media (prefers-reduced-motion: reduce){
  .ldd-duck-sprite--neutral,.ldd-duck-sprite--happy,.ldd-duck-hop--active,
  .ldd-duck-hop--celebrate,.ldd-duck-hop:has(.ldd-duck-sprite--happy){animation:none !important;}
}
`;
