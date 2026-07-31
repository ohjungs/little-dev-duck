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
// 2026-07-27 (2차 피드백 1-1, Phase 42 T5): 호출부가 24 → 32px로 키웠다.
// **파일은 그대로 둔다.** 원본이 96×96이라 32px도 여전히 3배 축소다 — 업스케일이 아니므로
// 뭉개지지 않고, 재인코딩할 이유도 없다(계획은 재인코딩이 필요하다고 봤지만 실측하니 아니었다).
// 이 파일을 다시 만들 때만 96px 상한과 용량(24.8KB)을 지키면 된다.
//
// 폴백이 필요한 이유: 로고가 사라지면 상단 좌측이 그냥 뚫려 보인다. 영상을 못 받으면
// 기존 SVG 로고(`DuckLogo`)로 떨어진다. 움직임 줄이기 설정은 `DuckVideo`가 이미 지킨다
// (재생하지 않고 poster만 — 영상을 내려받지도 않는다).

// 2026-07-31 : 로고 - 배경 - 흰 원형 배지 (사용자 결정)
// 사용자 보고: "어두운 테마에서 로고가 흰 덩어리로 보인다". 원인은 로딩 실패가 아니라
// **자산 자체가 흰 배경**이라는 것이다 — 영상도 포스터도 흰 바탕에 오리가 그려져 있다.
//
// 사용자가 고른 해법은 "흰 사각형을 없애는" 쪽이 아니라 **의도된 흰 배지로 만드는** 쪽이다.
// 그래서 영상을 원으로 잘라 낸다(`rounded-full` + `overflow-hidden`). 흰 배경이 배지의 면이
// 되므로 어두운 테마에서 튀지 않고 **오리 움직임은 그대로 남는다**(투명 SVG로 바꾸면 정지한다).
//
// 테두리를 함께 두는 이유: 라이트 테마에서는 배지의 흰 면이 카드 배경과 거의 같아 원의 경계가
// 사라진다. 어두운 테마에서만 보고 끝내면 라이트에서 배지가 없는 것처럼 보인다.
export function AnimatedDuckLogo({ size = 24 }: { size?: number }) {
  // DuckVideo는 크기를 인자로 받지 않는다(종횡비·크롭만 담당). 크기는 감싸는 요소가 정하고
  // 영상이 그 안을 채우게 한다 — 그래야 호출부가 임의의 px을 줄 수 있다.
  return (
    <span
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
      className="overflow-hidden rounded-full bg-white ring-1 ring-black/10"
    >
      <DuckVideo
        surface="logo"
        className="size-full rounded-full"
        fallback={<DuckLogo size={size} />}
      />
    </span>
  );
}
