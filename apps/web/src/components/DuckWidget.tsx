"use client";

import dynamic from "next/dynamic";
import { useDuckMood } from "./useDuckMood";

const DUCK_HEIGHT = 220;

// r3f Canvas는 WebGL을 쓰므로 서버 렌더링이 불가능해 클라이언트 전용으로 로드한다.
// 로딩 중에도 같은 높이의 자리를 예약해 청크 로드 후 레이아웃이 밀리지 않게 한다.
const Duck = dynamic(() => import("@ldd/mascot").then((mod) => mod.Duck), {
  ssr: false,
  loading: () => <div style={{ height: DUCK_HEIGHT }} />,
});

export function DuckWidget() {
  const mood = useDuckMood();
  return <Duck height={DUCK_HEIGHT} mood={mood} />;
}
