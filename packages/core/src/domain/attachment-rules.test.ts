import { describe, expect, it } from "vitest";
import {
  MESSAGE_IMAGE_MAX_BYTES,
  MESSAGE_IMAGE_TYPES,
  checkMessageImage,
  messageAttachmentPath,
  resizeTarget,
} from "./attachment-rules";

describe("이미지 검사", () => {
  it("허용 형식은 통과한다", () => {
    for (const type of MESSAGE_IMAGE_TYPES) {
      expect(checkMessageImage({ type, size: 1000 }).ok).toBe(true);
    }
  });

  it("SVG를 막는다 (크기가 아니라 스크립트를 품을 수 있어서다)", () => {
    const r = checkMessageImage({ type: "image/svg+xml", size: 100 });
    expect(r.ok).toBe(false);
  });

  it("실행 파일·문서 형식을 막는다", () => {
    for (const type of ["application/x-msdownload", "text/html", "application/pdf"]) {
      expect(checkMessageImage({ type, size: 100 }).ok).toBe(false);
    }
  });

  it("상한을 넘으면 막고, 딱 맞으면 통과한다", () => {
    expect(checkMessageImage({ type: "image/png", size: MESSAGE_IMAGE_MAX_BYTES + 1 }).ok).toBe(false);
    expect(checkMessageImage({ type: "image/png", size: MESSAGE_IMAGE_MAX_BYTES }).ok).toBe(true);
  });

  it("빈 파일을 막는다 (올려도 아무것도 안 보인다)", () => {
    expect(checkMessageImage({ type: "image/png", size: 0 }).ok).toBe(false);
  });

  it("거부 사유를 사람 말로 준다 (무엇을 고쳐야 할지 알 수 있게)", () => {
    const tooBig = checkMessageImage({ type: "image/png", size: MESSAGE_IMAGE_MAX_BYTES + 1 });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.reason).toContain("2MB");
  });

  // 버킷과 값이 갈라지면 사용자는 "왜 올렸는데 실패하지"를 겪는다.
  it("상한이 버킷 file_size_limit(2MB)와 같다", () => {
    expect(MESSAGE_IMAGE_MAX_BYTES).toBe(2097152);
  });
});

describe("리사이즈 목표", () => {
  it("긴 변을 상한에 맞추고 비율을 유지한다", () => {
    const r = resizeTarget(3200, 1600, 1600);
    expect(r).toEqual({ width: 1600, height: 800 });
  });

  it("세로가 긴 이미지도 같은 규칙", () => {
    expect(resizeTarget(1000, 4000, 1600)).toEqual({ width: 400, height: 1600 });
  });

  it("원본보다 키우지 않는다 (늘리면 용량만 커지고 화질은 나빠진다)", () => {
    expect(resizeTarget(200, 100, 1600)).toEqual({ width: 200, height: 100 });
  });

  it("정수로 내림한다 (캔버스가 소수를 받으면 1px씩 어긋난다)", () => {
    const r = resizeTarget(1001, 3003, 1600);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });

  it("아주 가느다란 이미지도 0이 되지 않는다 (캔버스가 던진다)", () => {
    const r = resizeTarget(10000, 1, 1600);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });

  it("잘못된 크기에 던지지 않는다", () => {
    expect(resizeTarget(0, 0)).toEqual({ width: 0, height: 0 });
    expect(resizeTarget(-5, 10)).toEqual({ width: 0, height: 0 });
  });
});

describe("스토리지 경로", () => {
  it("첫 칸이 방 id다 (버킷 정책이 폴더 이름으로 멤버를 판정한다)", () => {
    const path = messageAttachmentPath("room-1", "file-1", "png");
    expect(path.split("/")[0]).toBe("room-1");
  });

  it("확장자에서 위험한 문자를 걷어낸다", () => {
    // '../'나 쿼리가 섞이면 경로가 폴더 밖을 가리킬 수 있다.
    expect(messageAttachmentPath("r", "f", "../png")).toBe("r/f.png");
    expect(messageAttachmentPath("r", "f", "PNG?x=1")).toBe("r/f.pngx1");
  });
});
