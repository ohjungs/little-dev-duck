"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const DUCK_WIDTH = 160;

// Tauri 투명 창(walker)에서 로드되는 전용 씬. r3f Canvas는 WebGL이라 클라이언트 전용.
const Duck = dynamic(() => import("@ldd/mascot").then((mod) => mod.Duck), {
  ssr: false,
  loading: () => <div style={{ height: DUCK_WIDTH }} />,
});

export function WalkerScene() {
  useEffect(() => {
    // 이 라우트에서만 배경을 투명하게 만들어 오리 외에는 아무것도 안 보이게 한다
    // (globals.css의 기본 배경을 덮어씀). 언마운트 시 원복.
    const { documentElement: html, body } = document;
    const prev = { html: html.style.background, body: body.style.background };
    html.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      html.style.background = prev.html;
      body.style.background = prev.body;
    };
  }, []);

  return (
    <div className="walker-stage">
      <div className="walker-duck">
        {/* /walker는 무인증 공개 라우트라 사용자 데이터(투두/커밋)를 읽을 수 없다. 데이터 기반
            mood 대신 고정 happy로 둔다 — 위젯 오리(DuckWidget)만 실제 mood를 반영한다. */}
        <Duck height={DUCK_WIDTH} mood="happy" />
      </div>
      <style>{`
        .walker-stage {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: transparent;
          pointer-events: none;
        }
        .walker-duck {
          position: absolute;
          bottom: 24px;
          left: 0;
          width: ${DUCK_WIDTH}px;
          animation: ldd-walk 26s linear infinite alternate;
        }
        @keyframes ldd-walk {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw - ${DUCK_WIDTH}px)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .walker-duck { animation: none; }
        }
      `}</style>
    </div>
  );
}
