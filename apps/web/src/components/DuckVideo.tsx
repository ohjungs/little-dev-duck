"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@ldd/mascot";
import {
  getDuckVideoSpec,
  objectPositionCss,
  type DuckVideoSurface,
} from "@/lib/duckVideo";

// 2026-07-26 : 오리 영상 - 재생 정책 - 자동재생 제약
// autoPlay 속성을 쓰지 않고 play()를 직접 부른다. 첫 렌더는 움직임 줄이기 설정을 알 수 없어
// autoPlay=true로 시작할 수밖에 없고, 그 사이 재생이 시작되면 뒤늦게 속성을 껴도 멈추지 않는다
// (실측: 영상이 2.4MB일 때는 느려서 우연히 막혔고, 576KB로 줄이자 새어 나갔다).
// muted + playsInline이 없으면 브라우저가 play()를 거부한다(모바일 Safari 포함). 소리가 없는
// 영상이라 muted는 손실이 아니다. preload="none" 덕에 움직임 줄이기 사용자는 영상을 아예
// 내려받지 않고 poster만 본다.
// 크롭 창(종횡비·object-position)은 lib/duckVideo가 화면별로 계산해 준다.

type DuckVideoProps = {
  surface: DuckVideoSurface;
  className?: string;
  // 영상을 못 받았을 때 대신 그릴 것. 로고처럼 **비면 자리가 뚫려 보이는** 곳에서 쓴다
  // (poster도 같이 실패할 수 있고, 그때 <video>는 아무것도 그리지 않는다).
  fallback?: ReactNode;
};

export function DuckVideo({ surface, className, fallback }: DuckVideoProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const spec = getDuckVideoSpec(surface);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // 훅의 첫 렌더 값은 아직 false다(서버 렌더와 맞추기 위해). 그 값을 믿고 여기서 play()를
    // 부르면 움직임 줄이기 사용자도 576KB를 내려받게 된다 - 효과 안에서는 설정을 직접 읽는다.
    // 훅은 사용자가 설정을 바꿨을 때 이 효과를 다시 돌리는 역할만 한다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    video.preload = "auto";
    // 자동재생이 거부되면(정책·저전력 모드) poster가 그대로 남는다 — 화면이 비지는 않는다.
    void video.play().catch(() => {});
  }, [reducedMotion]);

  if (failed && fallback) return <>{fallback}</>;

  return (
    <video
      ref={ref}
      src={spec.src}
      poster={spec.poster}
      loop={spec.loop}
      muted
      playsInline
      preload="none"
      disablePictureInPicture
      onError={() => setFailed(true)}
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
