// 2026-07-27 : 메신저 - 이미지 첨부 규칙 (Phase 50 T4)
//
// 계획이 "**스토리지가 1GB뿐이다. 리사이즈는 선택이 아니라 생존 조건**"이라 못박았다.
// 원본 3MB 사진 330장이면 찬다.
//
// **여기는 사용자에게 미리 알려 주기 위한 규칙이다.** 진짜 방어선은 버킷
// (`allowed_mime_types` · `file_size_limit`)이고, 그건 공격자가 Storage REST로 직접
// 올려도 막는다. 화면에서만 막으면 우회된다 — 두 곳 다 있어야 하고, **값이 갈라지면
// 사용자는 "왜 올렸는데 실패하지"를 겪는다.** 그래서 버킷과 같은 값을 여기 적고 테스트로 잠근다.

/** 버킷 `message-attachments`의 `allowed_mime_types`와 **같아야 한다**. */
export const MESSAGE_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** 버킷 `file_size_limit`(2MB)와 **같아야 한다**. */
export const MESSAGE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** 리사이즈 목표 긴 변(px). 대화 화면에서 이보다 크게 볼 일이 없다. */
export const MESSAGE_IMAGE_MAX_EDGE = 1600;

export type AttachmentCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * 올리기 전에 화면에서 걸러 준다. **거부 사유를 사람 말로 준다** —
 * "실패했습니다"만 보여 주면 무엇을 고쳐야 할지 알 수 없다.
 *
 * SVG를 막는 이유는 크기가 아니라 **스크립트를 품을 수 있는 액티브 콘텐츠**라서다.
 */
export function checkMessageImage(file: { type: string; size: number }): AttachmentCheck {
  if (!(MESSAGE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "PNG·JPEG·WebP·GIF 이미지만 보낼 수 있어요." };
  }
  if (file.size > MESSAGE_IMAGE_MAX_BYTES) {
    return { ok: false, reason: "이미지가 너무 커요. 2MB 아래로 줄여 주세요." };
  }
  // 0바이트 파일은 브라우저가 만들어 주기도 한다(드래그 실패 등). 올려도 아무것도 안 보인다.
  if (file.size <= 0) {
    return { ok: false, reason: "빈 파일이에요." };
  }
  return { ok: true };
}

/**
 * 리사이즈 목표 크기. **비율을 유지하고, 원본보다 키우지 않는다** —
 * 작은 이미지를 늘리면 용량만 커지고 화질은 나빠진다.
 * 정수로 내림한다(캔버스는 소수 크기를 받으면 반올림해 1px씩 어긋난다).
 */
export function resizeTarget(
  width: number,
  height: number,
  maxEdge: number = MESSAGE_IMAGE_MAX_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  // 최소 1px — 극단적으로 가느다란 이미지에서 0이 되면 캔버스가 던진다.
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/**
 * 스토리지 경로. **첫 칸이 방 id여야 한다** — 버킷 정책이 폴더 이름으로 멤버를 판정한다.
 * 규약이 어긋나면 올린 사람도 자기 파일을 못 읽는다.
 */
export function messageAttachmentPath(roomId: string, fileId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${roomId}/${fileId}.${safeExt}`;
}
