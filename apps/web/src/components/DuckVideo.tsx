"use client";

import { usePrefersReducedMotion } from "@ldd/mascot";
import {
  getDuckVideoPlayback,
  getDuckVideoSpec,
  objectPositionCss,
  type DuckVideoSurface,
} from "@/lib/duckVideo";

// 2026-07-26 : 오리 영상 - 재생 정책 - 자동재생 제약
// muted + playsInline이 없으면 브라우저가 자동재생을 거부한다(모바일 Safari 포함). 소리는 애초에
// 없는 영상이라 muted가 손실이 아니다. 움직임 줄이기 설정에서는 자동재생·다운로드를 모두 끄고
// poster만 남긴다 - <video>를 <img>로 바꿔치기하면 하이드레이션 후 레이아웃이 튀어서 속성만 바꾼다.
// 크롭 창(종횡비·object-position)은 lib/duckVideo가 화면별로 계산해 준다.

type DuckVideoProps = {
  surface: DuckVideoSurface;
  className?: string;
};

export function DuckVideo({ surface, className }: DuckVideoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const spec = getDuckVideoSpec(surface);
  const { autoPlay, preload } = getDuckVideoPlayback(reducedMotion);

  return (
    <video
      src={spec.src}
      poster={spec.poster}
      autoPlay={autoPlay}
      loop={spec.loop}
      muted
      playsInline
      preload={preload}
      disablePictureInPicture
      aria-label={spec.label}
      role="img"
      className={className}
      style={{
        aspectRatio: spec.aspectRatio,
        objectFit: "cover",
        objectPosition: objectPositionCss(spec.objectPosition),
      }}
    />
  );
}
