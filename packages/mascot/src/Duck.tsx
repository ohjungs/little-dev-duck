"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import { pickPhrase } from "./phrases";

// ponytail: Meshy에서 model.glb를 아직 받지 못해 기본 도형(sphere/cone/torus)으로
// 캐릭터 바이블(ducky-mascot repo docs/CHARACTER.md) 색상·비율만 맞춘 플레이스홀더.
// GLB 준비되면 이 파일의 <DuckModel>을 useGLTF 로드로 교체.
const COLOR_BODY = "#F6EFDD";
const COLOR_BEAK = "#A99C65";
const COLOR_OUTLINE = "#352116";

const SPEECH_BUBBLE_DURATION_MS = 2000;
const SQUISH_DECAY_PER_SECOND = 4;

function DuckModel({ onGreet }: { onGreet: () => void }) {
  const groupRef = useRef<Group>(null);
  const squishRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    squishRef.current = Math.max(
      0,
      squishRef.current - SQUISH_DECAY_PER_SECOND * delta,
    );
    const squish = squishRef.current;
    groupRef.current.scale.set(1 + squish * 0.3, 1 - squish * 0.4, 1 + squish * 0.3);
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
}

export function Duck({ height = 220 }: DuckProps) {
  const clickCountRef = useRef(0);
  const [phrase, setPhrase] = useState(() => pickPhrase(0));
  const [showBubble, setShowBubble] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGreet = () => {
    // 클릭 시점의 문구를 바로 고정한다 - clickCount를 렌더링에서 파생시키면
    // setClickCount로 인한 리렌더 이후 값을 읽어 항상 한 칸 밀려 표시된다.
    setPhrase(pickPhrase(clickCountRef.current));
    clickCountRef.current += 1;
    setShowBubble(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => setShowBubble(false),
      SPEECH_BUBBLE_DURATION_MS,
    );
  };

  return (
    <div style={{ height, width: "100%" }} data-testid="duck-widget">
      <Canvas camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 4]} intensity={1} />
        <DuckModel onGreet={handleGreet} />
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
