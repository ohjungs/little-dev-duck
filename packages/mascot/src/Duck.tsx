"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { isQuietHour, type DuckMood } from "@ldd/core";
import { pickIdlePhrase, pickPhrase } from "./phrases";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Meshy에서 받은 실제 모델(apps/web/public/little_dev_duck.glb, 배포된 웹 origin 루트에서 서빙 —
// Tauri 위젯도 옵션 A라 같은 배포 URL을 로드하므로 동일 경로로 통한다). 49MB로 커서 로딩에 수 초
// 걸릴 수 있어 Suspense fallback을 둔다. 스케일/위치는 실측 전 추정치라 실제로 보고 조정 필요할 수 있음.
const MODEL_URL = "/little_dev_duck.glb";

const SPEECH_BUBBLE_DURATION_MS = 2000;
const SQUISH_DECAY_PER_SECOND = 4;

// 레벨업 축하 연출: 진행값이 1→0으로 감쇠하는 동안 y축 한 바퀴 회전 + 한 번 도약.
// 0.85/초라 약 1.2초 만에 자연 종료(별도 타이머 없이 useFrame에서 decay).
const CELEBRATE_DECAY_PER_SECOND = 0.85;
const CELEBRATE_HOP_HEIGHT = 0.5;

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
  celebrate,
  onGreet,
}: {
  mood: DuckMood;
  reducedMotion: boolean;
  celebrate: boolean;
  onGreet: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const squishRef = useRef(0);
  const celebrateRef = useRef(0);

  // celebrate가 true로 바뀌는 순간 축하 연출을 시작한다. reduced-motion이면 모션을 생략한다.
  useEffect(() => {
    if (celebrate && !reducedMotion) celebrateRef.current = 1;
  }, [celebrate, reducedMotion]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    squishRef.current = Math.max(
      0,
      squishRef.current - SQUISH_DECAY_PER_SECOND * delta,
    );
    const squish = squishRef.current;

    celebrateRef.current = Math.max(
      0,
      celebrateRef.current - CELEBRATE_DECAY_PER_SECOND * delta,
    );
    const celebration = celebrateRef.current;

    const motion = MOOD_MOTION[mood];
    // reduced-motion: 흔들림은 끄되 mood별 정적 자세(높이/기울기)는 유지해 정보는 남긴다.
    const bob = reducedMotion
      ? 0
      : Math.sin(state.clock.elapsedTime * motion.bobSpeed) * motion.bobAmp;
    // 축하 도약: 연출 구간(1→0) 동안 sin 곡선으로 한 번 크게 튀어올랐다 내려온다.
    const hop =
      celebration > 0
        ? Math.sin((1 - celebration) * Math.PI) * CELEBRATE_HOP_HEIGHT
        : 0;
    group.position.y = motion.baseY + bob + hop;
    group.rotation.x = motion.tiltX;
    // 축하 회전: 감쇠하는 동안 y축 한 바퀴(2π), 종료 시 정확히 0으로 복귀(mood 모션과 무간섭).
    group.rotation.y =
      celebration > 0 ? (1 - celebration) * Math.PI * 2 : 0;
    group.scale.set(1 + squish * 0.3, 1 - squish * 0.4, 1 + squish * 0.3);
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 겹친 메시(몸통/머리/안경 등)를 전부 통과하는 레이캐스트라 stopPropagation 없이는
    // 클릭 한 번에 onGreet이 여러 번 불린다.
    event.stopPropagation();
    squishRef.current = 1;
    onGreet();
  };

  const { scene } = useGLTF(MODEL_URL);

  return (
    <group ref={groupRef} onClick={handleClick}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

// 모델 로딩 중(수 초 소요 가능) 빈 캔버스 대신 보여줄 최소 표시.
function DuckLoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          color: "var(--ldd-color-text, #352116)",
          fontSize: "0.85rem",
          whiteSpace: "nowrap",
        }}
      >
        오리 불러오는 중...
      </div>
    </Html>
  );
}

export interface DuckProps {
  height?: number;
  mood?: DuckMood;
  // true가 되는 순간 짧은 레벨업 축하 연출(회전+도약)을 재생한다. 기본 false(하위호환).
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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막 상호작용 시각. 유휴 판정(T2)의 기준이며, 클릭 때마다 갱신된다.
  const lastInteractionRef = useRef(0);
  // 방해금지 설정을 매 렌더 최신값으로 보관 — idle 타이머 콜백이 재구독 없이 현재 값을 읽는다.
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
        // 방해금지 시간대(로컬 시각 기준)엔 혼잣말을 건너뛴다(밤엔 오리도 잔다 — Phase 12 T2).
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
        <Suspense fallback={<DuckLoadingFallback />}>
          <DuckModel
            mood={mood}
            reducedMotion={reducedMotion}
            celebrate={celebrate}
            onGreet={handleGreet}
          />
        </Suspense>
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
