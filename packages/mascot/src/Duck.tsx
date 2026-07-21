"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { DuckMood } from "@ldd/core";
import { pickIdlePhrase, pickPhrase } from "./phrases";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// ponytail: Meshy에서 model.glb를 아직 받지 못해 기본 도형(sphere/cone/torus)으로
// 캐릭터 바이블(ducky-mascot repo docs/CHARACTER.md) 색상·비율만 맞춘 플레이스홀더.
// GLB 준비되면 이 파일의 <DuckModel>을 useGLTF 로드로 교체.
const COLOR_BODY = "#F6EFDD";
const COLOR_BEAK = "#A99C65";
const COLOR_OUTLINE = "#352116";

const SPEECH_BUBBLE_DURATION_MS = 2000;
const SQUISH_DECAY_PER_SECOND = 4;

// 유휴 상태에서 스스로 말풍선을 띄우는 주기(T2 자율 행동). 사용자가 클릭하면 리셋된다.
const IDLE_MIN_MS = 12_000;
const IDLE_MAX_MS = 24_000;

// mood별 지속 자세 파라미터. 몸통 색은 캐릭터 바이블 고정값이라 건드리지 않고(DECISIONS.md 4절),
// 자세(높이/기울기/흔들림 진폭·속도)로만 기분을 표현한다.
const MOOD_MOTION: Record<
  DuckMood,
  { baseY: number; bobAmp: number; bobSpeed: number; tiltX: number }
> = {
  happy: { baseY: 0.05, bobAmp: 0.12, bobSpeed: 3.2, tiltX: 0 },
  sad: { baseY: -0.12, bobAmp: 0.02, bobSpeed: 1.0, tiltX: 0.18 },
  neutral: { baseY: 0.0, bobAmp: 0.05, bobSpeed: 1.5, tiltX: 0 },
};

const MOOD_LABEL: Record<DuckMood, string> = {
  happy: "기분 좋음",
  sad: "시무룩함",
  neutral: "평온함",
};

function DuckModel({
  mood,
  reducedMotion,
  onGreet,
}: {
  mood: DuckMood;
  reducedMotion: boolean;
  onGreet: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const squishRef = useRef(0);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    squishRef.current = Math.max(
      0,
      squishRef.current - SQUISH_DECAY_PER_SECOND * delta,
    );
    const squish = squishRef.current;

    const motion = MOOD_MOTION[mood];
    // reduced-motion: 흔들림은 끄되 mood별 정적 자세(높이/기울기)는 유지해 정보는 남긴다.
    const bob = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * motion.bobSpeed) * motion.bobAmp;
    group.position.y = motion.baseY + bob;
    group.rotation.x = motion.tiltX;
    group.scale.set(1 + squish * 0.3, 1 - squish * 0.4, 1 + squish * 0.3);
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 겹친 메시(몸통/머리/안경 등)를 전부 통과하는 레이캐스트라 stopPropagation 없이는
    // 클릭 한 번에 onGreet이 여러 번 불린다.
    event.stopPropagation();
    squishRef.current = 1;
    onGreet();
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* 몸통 */}
      <mesh position={[0, -0.5, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color={COLOR_BODY} />
      </mesh>
      {/* 머리 (치비 2등신 - 몸통과 비슷한 크기) */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color={COLOR_BODY} />
      </mesh>
      {/* 부리 */}
      <mesh position={[0, 0.35, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.25, 16]} />
        <meshStandardMaterial color={COLOR_BEAK} />
      </mesh>
      {/* 물갈퀴 (양쪽 발) */}
      <mesh position={[-0.25, -1.05, 0.1]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={COLOR_BEAK} />
      </mesh>
      <mesh position={[0.25, -1.05, 0.1]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={COLOR_BEAK} />
      </mesh>
      {/* 안경 (렌즈 두 개 + 다리) */}
      <mesh position={[-0.2, 0.42, 0.48]}>
        <torusGeometry args={[0.16, 0.03, 16, 32]} />
        <meshStandardMaterial color={COLOR_OUTLINE} />
      </mesh>
      <mesh position={[0.2, 0.42, 0.48]}>
        <torusGeometry args={[0.16, 0.03, 16, 32]} />
        <meshStandardMaterial color={COLOR_OUTLINE} />
      </mesh>
      <mesh position={[0, 0.42, 0.48]}>
        <boxGeometry args={[0.1, 0.03, 0.03]} />
        <meshStandardMaterial color={COLOR_OUTLINE} />
      </mesh>
      {/* 눈 (안경 렌즈 안쪽) */}
      <mesh position={[-0.2, 0.42, 0.5]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={COLOR_OUTLINE} />
      </mesh>
      <mesh position={[0.2, 0.42, 0.5]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={COLOR_OUTLINE} />
      </mesh>
      {/* 정수리 곱슬 깃털 한 가닥 */}
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.04, 0.25, 8]} />
        <meshStandardMaterial color={COLOR_BEAK} />
      </mesh>
    </group>
  );
}

export interface DuckProps {
  height?: number;
  mood?: DuckMood;
}

export function Duck({ height = 220, mood = "neutral" }: DuckProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clickCountRef = useRef(0);
  const [phrase, setPhrase] = useState(() => pickPhrase(0));
  const [showBubble, setShowBubble] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막 상호작용 시각. 유휴 판정(T2)의 기준이며, 클릭 때마다 갱신된다.
  const lastInteractionRef = useRef(0);

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
    // 클릭 시점의 문구를 바로 고정한다 - clickCount를 렌더링에서 파생시키면
    // setClickCount로 인한 리렌더 이후 값을 읽어 항상 한 칸 밀려 표시된다.
    speak(pickPhrase(clickCountRef.current));
    clickCountRef.current += 1;
    lastInteractionRef.current = Date.now();
  };

  // T2 자율 행동: 일정 시간 상호작용이 없으면 mood에 맞는 혼잣말을 스스로 띄운다.
  // reduced-motion이어도 동작(모션)이 아닌 텍스트라 접근성상 유지한다.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleIdle = () => {
      const wait = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
      timer = setTimeout(() => {
        const idleFor = Date.now() - lastInteractionRef.current;
        if (idleFor >= IDLE_MIN_MS) {
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
    };
  }, []);

  return (
    <div
      style={{ height, width: "100%" }}
      data-testid="duck-widget"
      role="img"
      aria-label={`오리 상태: ${MOOD_LABEL[mood]}`}
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 4]} intensity={1} />
        <DuckModel
          mood={mood}
          reducedMotion={reducedMotion}
          onGreet={handleGreet}
        />
        {showBubble && (
          <Html position={[0, 1.4, 0]} center distanceFactor={8}>
            <div
              style={{
                background: "var(--ldd-color-bg, #F6EFDD)",
                color: "var(--ldd-color-text, #352116)",
                border: "1px solid var(--ldd-color-accent, #A99C65)",
                borderRadius: "10px",
                padding: "0.4rem 0.75rem",
                fontSize: "0.85rem",
                whiteSpace: "nowrap",
              }}
            >
              {phrase}
            </div>
          </Html>
        )}
      </Canvas>
    </div>
  );
}
