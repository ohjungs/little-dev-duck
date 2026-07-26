import { describe, it, expect } from "vitest";
import { decodeTextBytes } from "../decodeTextFile";

// 2026-07-26 : 페이지 - 가져오기 - 한글깨짐 (피드백 2-1)
// 핵심 회귀: .md 가져오기가 UTF-8로만 읽어 CP949 파일이 전부 깨졌다.

function bytes(...arr: number[]): ArrayBuffer {
  return new Uint8Array(arr).buffer;
}

function utf8(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

// CP949로 "가나다" = B0A1 B3AA B4D9 (표준 완성형 코드)
const CP949_GANADA = [0xb0, 0xa1, 0xb3, 0xaa, 0xb4, 0xd9];

describe("decodeTextBytes", () => {
  it("UTF-8 한글을 그대로 읽는다", () => {
    const r = decodeTextBytes(utf8("# 회의록\n오리와 함께"));
    expect(r.text).toBe("# 회의록\n오리와 함께");
    expect(r.encoding).toBe("utf-8");
  });

  it("CP949 한글을 깨뜨리지 않고 읽는다(이번 버그의 핵심)", () => {
    const r = decodeTextBytes(bytes(...CP949_GANADA));
    expect(r.text).toBe("가나다");
    expect(r.encoding).toBe("cp949");
  });

  it("CP949 파일에 ASCII가 섞여 있어도 온전하다", () => {
    // "# 가나다" — '#', ' '는 ASCII 그대로
    const r = decodeTextBytes(bytes(0x23, 0x20, ...CP949_GANADA));
    expect(r.text).toBe("# 가나다");
  });

  it("UTF-8 BOM을 본문에 남기지 않는다", () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("제목")]);
    const r = decodeTextBytes(withBom.buffer as ArrayBuffer);
    expect(r.text).toBe("제목");
    expect(r.text.charCodeAt(0)).not.toBe(0xfeff);
    expect(r.encoding).toBe("utf-8");
  });

  it("UTF-16LE BOM 파일을 읽는다", () => {
    // "가" = U+AC00 → LE 바이트 00 AC, BOM FF FE
    const r = decodeTextBytes(bytes(0xff, 0xfe, 0x00, 0xac));
    expect(r.text).toBe("가");
    expect(r.encoding).toBe("utf-16le");
  });

  it("UTF-16BE BOM 파일을 읽는다", () => {
    const r = decodeTextBytes(bytes(0xfe, 0xff, 0xac, 0x00));
    expect(r.text).toBe("가");
    expect(r.encoding).toBe("utf-16be");
  });

  it("영어만 있는 파일은 종전과 똑같이 UTF-8로 읽힌다", () => {
    // 기존 동작 보존 확인 — 정상 파일의 결과가 바뀌면 그건 개선이 아니라 회귀다.
    const r = decodeTextBytes(utf8("# Meeting Notes\n- item"));
    expect(r.text).toBe("# Meeting Notes\n- item");
    expect(r.encoding).toBe("utf-8");
  });

  it("빈 파일은 빈 문자열이다(예외를 던지지 않는다)", () => {
    const r = decodeTextBytes(bytes());
    expect(r.text).toBe("");
  });

  it("BOM만 있는 파일도 빈 문자열이다", () => {
    expect(decodeTextBytes(bytes(0xef, 0xbb, 0xbf)).text).toBe("");
  });

  it("이모지·4바이트 UTF-8도 온전하다", () => {
    const r = decodeTextBytes(utf8("🦆 오리 📄"));
    expect(r.text).toBe("🦆 오리 📄");
    expect(r.encoding).toBe("utf-8");
  });

  it("어떤 바이트열이 와도 예외를 던지지 않는다", () => {
    // 가져오기가 예외로 죽으면 사용자는 "실패했습니다"만 보고 이유를 모른다.
    for (const b of [[0xff], [0x80, 0x81], [0xc3], [0xe0, 0xa0]]) {
      expect(() => decodeTextBytes(bytes(...b))).not.toThrow();
    }
  });
});
