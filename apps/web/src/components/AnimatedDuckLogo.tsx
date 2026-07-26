"use client";

import { DuckLogo } from "@/components/DuckLogo";
import { DuckVideo } from "@/components/DuckVideo";

// 2026-07-26 : 로고 - 영상 - 상시 재생 (피드백 1-6)
// "왼쪽위 작은오리 이미지는 내가 준 움직이는 오리 영상으로 대체해서 계속 움직이는것처럼해줘".
//
// 사용자가 준 `duck-idle.mp4`를 **그대로 쓰지 않았다.** 로고는 24px인데 원본은 1280x720이라,
// 브라우저가 24px을 그리려고 720p 프레임을 계속 디코딩한다 — 그것도 모든 앱 화면에서 상시로.
// 같은 영상의 가운데를 정사각으로 잘라 96px로 줄인 파일을 만들어 쓴다(311KB → 24.8KB).
// 외형은 원본 그대로고 해상도만 로고 크기에 맞췄다.
//
// 폴백이 필요한 이유: 로고가 사라지면 상단 좌측이 그냥 뚫려 보인다. 영상을 못 받으면
// 기존 SVG 로고(`DuckLogo`)로 떨어진다. 움직임 줄이기 설정은 `DuckVideo`가 이미 지킨다
// (재생하지 않고 poster만 — 영상을 내려받지도 않는다).

export function AnimatedDuckLogo({ size = 24 }: { size?: number }) {
  // DuckVideo는 크기를 인자로 받지 않는다(종횡비·크롭만 담당). 크기는 감싸는 요소가 정하고
  // 영상이 그 안을 채우게 한다 — 그래야 호출부가 임의의 px을 줄 수 있다.
  return (
    <span
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
    >
      <DuckVideo
        surface="logo"
        className="size-full rounded-md"
        fallback={<DuckLogo size={size} />}
      />
    </span>
  );
}
