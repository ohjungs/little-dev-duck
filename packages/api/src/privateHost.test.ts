import { describe, expect, it } from "vitest";
import { isPrivateHost } from "./news";

// 2026-07-30 : 보안 - SSRF - 사설대역 판정 단위 테스트
//
// `news.test.ts`는 `addFeed`를 통해 **사용자에게 보이는 계약**("내부/사설 주소는 거부한다")을
// 검사한다. 이 파일은 그 아래의 판정 함수 자체를 검사한다 — 갈래가 IPv4/IPv6·매핑·압축 표기로
// 여럿이라 라우트를 거쳐 하나씩 확인하면 비싸고, 어느 갈래가 틀렸는지도 드러나지 않는다.
//
// **입력은 항상 `new URL(url).hostname` 값**이라는 계약을 여기서도 지킨다(원문 문자열이 아니다).
// 그래서 케이스를 URL로 적고 파서를 통과시킨 뒤 판정한다 — 실제 호출부와 같은 모양이다.
// WHATWG 파서가 IPv4를 점 표기로, IPv6를 압축 16진수로 정규화하는 것이 이 함수의 전제다.
//
// 배경(왜 이 함수가 정규식에서 바뀌었나): docs/loop-eng/findings-2026-07-30-ssrf-ipv6-bypass.md

const host = (url: string): string => new URL(url).hostname;

describe("isPrivateHost — 차단해야 하는 것", () => {
  it.each([
    // IPv4 점 표기
    ["루프백", "http://127.0.0.1/"],
    ["루프백 다른 대역", "http://127.99.88.77/"],
    ["0.0.0.0", "http://0.0.0.0/"],
    ["10.x 사설", "http://10.0.0.1/"],
    ["192.168.x 사설", "http://192.168.1.1/"],
    ["172.16 사설 하단", "http://172.16.0.1/"],
    ["172.31 사설 상단", "http://172.31.255.255/"],
    ["클라우드 메타데이터", "http://169.254.169.254/latest/meta-data/"],
    ["localhost", "http://localhost/"],
    ["대문자 LOCALHOST", "http://LOCALHOST/"],

    // IPv4 대체표기 — 파서가 점 표기로 정규화해 주는 것에 의존한다.
    // 호스트 추출을 원문 문자열로 바꾸면 이 여섯이 한꺼번에 열린다.
    ["10진수", "http://2130706433/"],
    ["16진수", "http://0x7f000001/"],
    ["8진수", "http://0177.0.0.1/"],
    ["짧은 표기", "http://127.1/"],
    ["0 하나", "http://0/"],
    ["메타데이터 10진수", "http://2852039166/"],
    ["10.x 10진수", "http://167772161/"],
    ["192.168 16진수", "http://0xc0a80001/"],

    // IPv6 — 옛 정규식이 전부 놓쳤던 갈래
    ["IPv6 루프백", "http://[::1]/"],
    ["IPv6 루프백 비압축", "http://[0:0:0:0:0:0:0:1]/"],
    ["미지정 :: (연결 시 루프백)", "http://[::]/"],
    ["유니크 로컬 fc00::/7", "http://[fc00::1]/"],
    ["유니크 로컬 fd00", "http://[fd00::1]/"],
    ["링크 로컬 fe80::/10", "http://[fe80::1]/"],
    ["링크 로컬 다른 값", "http://[fe80::abcd:1234]/"],
    ["IPv4 매핑 루프백", "http://[::ffff:127.0.0.1]/"],
    ["IPv4 매핑 10.x", "http://[::ffff:10.0.0.1]/"],
    ["IPv4 매핑 192.168.x", "http://[::ffff:192.168.0.1]/"],
    ["IPv4 매핑 172.16.x", "http://[::ffff:172.16.0.1]/"],
    ["IPv4 매핑 메타데이터", "http://[::ffff:169.254.169.254]/"],
    ["NAT64 매핑 루프백", "http://[64:ff9b::127.0.0.1]/"],
    ["구형 IPv4 호환 표기", "http://[::7f00:1]/"],
  ])("%s — %s", (_label, url) => {
    expect(isPrivateHost(host(url))).toBe(true);
  });
});

describe("isPrivateHost — 통과해야 하는 것", () => {
  // 차단만 검사하면 "전부 차단하는 가드"도 통과한다. 정상 피드를 막지 않는지 함께 못박는다 —
  // 실제로 옛 구현은 fc/fd로 시작하는 모든 도메인을 막고 있었고 아무도 몰랐다.
  it.each([
    ["일반 도메인", "https://news.ycombinator.com/rss"],
    ["공인 IPv4", "http://93.184.216.34/"],
    ["공인 IPv6", "http://[2606:2800:220:1:248:1893:25c8:1946]/"],
    ["11.x는 사설이 아니다", "http://11.0.0.1/"],
    ["172.15는 사설 범위 밖(하단 경계)", "http://172.15.0.1/"],
    ["172.32는 사설 범위 밖(상단 경계)", "http://172.32.0.1/"],
    ["192.167은 사설이 아니다", "http://192.167.0.1/"],
    ["169.253은 링크로컬이 아니다", "http://169.253.0.1/"],
    ["fc 접두 도메인", "https://fcc.gov/rss"],
    ["fd 접두 도메인", "https://fdny.gov/feed"],
    ["fc 접두 도메인 2", "https://fcbarcelona.com/rss"],
    ["fe80 접두 도메인", "https://fe80example.com/rss"],
    ["localhost가 접두인 외부 도메인", "https://localhost.evil.com/rss"],
    ["127로 시작하는 도메인", "https://127labs.com/rss"],
    ["10으로 시작하는 도메인", "https://10up.com/feed"],
  ])("%s — %s", (_label, url) => {
    expect(isPrivateHost(host(url))).toBe(false);
  });
});

describe("isPrivateHost — 잘못된 입력에 던지지 않는다", () => {
  // 이 함수는 등록·수집 경로 한가운데 있다. 던지면 피드 수집이 통째로 죽는다.
  // 판정 불가는 "사설 아님"으로 떨어뜨린다 — 그 앞단에서 이미 `new URL`이 형식을 걸렀다.
  it.each(["", " ", ":", "::::", "[", "]", "[]", "fe80", "1.2.3", "zzzz::1", "[gggg::1]"])(
    "%s 에도 던지지 않는다",
    (raw) => {
      expect(() => isPrivateHost(raw)).not.toThrow();
      expect(typeof isPrivateHost(raw)).toBe("boolean");
    },
  );
});
