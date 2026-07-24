"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isQuietHour, type DuckMood } from "@ldd/core";
import { pickClickPhrase, pickIdlePhrase, pickPhrase } from "./phrases";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// 2026-07-25 : 오리 렌더링 - 49MB GLB(3D) 교체 - SVG+CSS 애니메이션
// 기존 3D 모델(/little_dev_duck.glb, 49MB)은 로딩이 수 초 걸리고 조명에 색이 씻겨 흰 덩어리처럼
// 보였다("깨짐"). 즉시 로드되는 SVG 아기오리 + CSS 애니메이션으로 교체한다. 대사·기분·유휴·클릭·
// 방해금지 로직은 그대로 보존하고, 눈 깜빡임/두리번/기분별 표정/터치 반응/축하 연출을 CSS로 표현.
// 몸통 색(캐릭터 바이블 고정값 계열)은 노란 오리로 유지.

const SPEECH_BUBBLE_DURATION_MS = 2000;
const SQUISH_MS = 320;

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
  // true가 되는 순간 짧은 레벨업 축하 연출(도약)을 재생한다. 기본 false(하위호환).
  celebrate?: boolean;
  // Phase 12 T2 방해금지(DND). 이 시간대(로컬)엔 유휴 혼잣말을 억제한다(밤엔 오리도 잔다). null=끔.
  quietHours?: { start: number; end: number } | null;
}

export function Duck({
  height = 220,
  mood = "neutral",
  celebrate = false,
  quietHours = null,
}: DuckProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clickCountRef = useRef(0);
  const [phrase, setPhrase] = useState(() => pickPhrase(0));
  const [showBubble, setShowBubble] = useState(false);
  const [squish, setSquish] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setSquish(true);
      if (squishTimer.current) clearTimeout(squishTimer.current);
      squishTimer.current = setTimeout(() => setSquish(false), SQUISH_MS);
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
        const quiet = q ? isQuietHour(new Date().getHours(), q.start, q.end) : false;
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

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (squishTimer.current) clearTimeout(squishTimer.current);
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleGreet();
    }
  };

  // 모션 클래스: reduced-motion이면 애니메이션을 끄고 정적 자세만 유지한다.
  const animClass = reducedMotion ? "" : `ldd-duck--anim ldd-duck--${mood}`;
  const celebrateClass = celebrate && !reducedMotion ? "ldd-duck--celebrate" : "";
  const squishClass = squish ? "ldd-duck--squish" : "";

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
        className={`ldd-duck-btn ${celebrateClass}`}
      >
        <svg
          viewBox="0 0 120 120"
          className={`ldd-duck ${animClass} ${squishClass}`}
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          {/* 그림자 */}
          <ellipse cx="60" cy="108" rx="26" ry="5" className="ldd-duck-shadow" />
          {/* 발 */}
          <g className="ldd-duck-feet">
            <path d="M48 96 l-8 10 h16 z" className="ldd-duck-foot" />
            <path d="M72 96 l-8 10 h16 z" className="ldd-duck-foot" />
          </g>
          {/* 몸통 */}
          <ellipse cx="60" cy="74" rx="34" ry="30" className="ldd-duck-body" />
          {/* 날개 */}
          <ellipse cx="34" cy="74" rx="10" ry="16" className="ldd-duck-wing ldd-duck-wing--l" />
          <ellipse cx="86" cy="74" rx="10" ry="16" className="ldd-duck-wing ldd-duck-wing--r" />
          {/* 머리 */}
          <circle cx="60" cy="40" r="26" className="ldd-duck-head" />
          {/* 볼(happy일 때 도드라짐) */}
          <circle cx="44" cy="46" r="5" className="ldd-duck-cheek" />
          <circle cx="76" cy="46" r="5" className="ldd-duck-cheek" />
          {/* 눈 */}
          <g className="ldd-duck-eyes">
            <circle cx="51" cy="38" r="4.5" className="ldd-duck-eye" />
            <circle cx="69" cy="38" r="4.5" className="ldd-duck-eye" />
            <circle cx="52.2" cy="36.8" r="1.5" className="ldd-duck-eye-shine" />
            <circle cx="70.2" cy="36.8" r="1.5" className="ldd-duck-eye-shine" />
          </g>
          {/* 부리 */}
          <ellipse cx="60" cy="50" rx="10" ry="6" className="ldd-duck-beak" />
          {/* 머리 깃털 */}
          <path d="M60 14 q-4 -8 2 -10 q6 -2 4 8 z" className="ldd-duck-tuft" />
          {/* 눈물(sad일 때만) */}
          <circle cx="51" cy="46" r="2.2" className="ldd-duck-tear" />
        </svg>
      </button>
    </div>
  );
}

// 스타일은 컴포넌트에 인라인해 별도 CSS 파일/빌드 설정 없이 어디서든 동작하게 한다(패키지 자기완결).
const DUCK_CSS = `
.ldd-duck-stage{position:relative;display:flex;align-items:center;justify-content:center;}
.ldd-duck-btn{background:none;border:none;padding:0;cursor:pointer;height:100%;display:flex;align-items:center;justify-content:center;outline:none;}
.ldd-duck-btn:focus-visible{outline:2px solid var(--ring,#ca8a04);outline-offset:4px;border-radius:16px;}
.ldd-duck{height:100%;width:auto;max-width:100%;transform-origin:60px 104px;transition:transform .18s ease;}
.ldd-duck-shadow{fill:rgba(0,0,0,.14);}
.ldd-duck-body{fill:#FFD23F;}
.ldd-duck-head{fill:#FFDD55;}
.ldd-duck-wing{fill:#F5C518;}
.ldd-duck-foot{fill:#F59E0B;}
.ldd-duck-beak{fill:#F97316;}
.ldd-duck-tuft{fill:#F5C518;}
.ldd-duck-eye{fill:#2B2118;}
.ldd-duck-eye-shine{fill:#fff;}
.ldd-duck-cheek{fill:#FDA4AF;opacity:0;transition:opacity .3s;}
.ldd-duck-tear{fill:#7DD3FC;opacity:0;}

/* 기분별 정적 자세(모션 없어도 유지) */
.ldd-duck--sad{transform:rotate(-4deg) translateY(4px);}
.ldd-duck--happy .ldd-duck-cheek{opacity:.85;}
.ldd-duck--sad .ldd-duck-tear{opacity:.9;}

/* 상시 유휴 애니메이션 */
.ldd-duck--anim{animation:lddBob 3s ease-in-out infinite;}
.ldd-duck--anim.ldd-duck--happy{animation:lddBob 1.7s ease-in-out infinite;}
.ldd-duck--anim.ldd-duck--sad{animation:lddBobSad 4s ease-in-out infinite;}
.ldd-duck--anim .ldd-duck-eyes{animation:lddBlink 4.5s infinite;transform-origin:60px 38px;}
.ldd-duck--anim .ldd-duck-head{animation:lddLook 9s ease-in-out infinite;transform-origin:60px 40px;}
.ldd-duck--anim.ldd-duck--sad .ldd-duck-tear{animation:lddTear 3.5s ease-in infinite;}

/* 클릭 시 찌부러짐(꽥) */
.ldd-duck--squish{animation:lddSquish .32s ease;}

/* 레벨업 축하: 도약 + 살짝 회전 */
.ldd-duck--celebrate .ldd-duck{animation:lddHop .6s ease;}

@keyframes lddBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes lddBobSad{0%,100%{transform:rotate(-4deg) translateY(4px)}50%{transform:rotate(-4deg) translateY(1px)}}
@keyframes lddBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes lddLook{0%,40%,100%{transform:rotate(0)}55%{transform:rotate(6deg)}75%{transform:rotate(-6deg)}}
@keyframes lddSquish{0%{transform:scale(1,1)}40%{transform:scale(1.18,.82)}70%{transform:scale(.94,1.06)}100%{transform:scale(1,1)}}
@keyframes lddHop{0%{transform:translateY(0) rotate(0)}30%{transform:translateY(-22px) rotate(8deg)}60%{transform:translateY(-6px) rotate(-6deg)}100%{transform:translateY(0) rotate(0)}}
@keyframes lddTear{0%,60%{opacity:0;transform:translateY(0)}70%{opacity:.9}100%{opacity:0;transform:translateY(10px)}}

.ldd-duck-bubble{position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:2;
  background:var(--ldd-color-bg,#F6EFDD);color:var(--ldd-color-text,#352116);
  border:1px solid var(--ldd-color-accent,#A99C65);border-radius:12px;padding:.4rem .75rem;
  font-size:.85rem;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12);pointer-events:none;}

@media (prefers-reduced-motion: reduce){
  .ldd-duck--anim,.ldd-duck--anim .ldd-duck-eyes,.ldd-duck--anim .ldd-duck-head,.ldd-duck--celebrate .ldd-duck,.ldd-duck--squish{animation:none !important;}
}
`;
