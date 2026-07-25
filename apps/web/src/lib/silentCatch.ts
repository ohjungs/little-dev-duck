// 2026-07-26 : 품질 - 오류처리 - 조용한실패차단
// 2026-07-26에 "눌렀는데 아무 일도 안 일어나고 이유도 없는" 지점을 7군데 고쳤다(버전 복원,
// 페이지 생성·복제·내보내기·삭제, 휴지통 복원·영구삭제). 전부 catch에서 조용히 삼킨 경우였고,
// 타입체크·린트·테스트를 모두 통과하고 있었다 — **아무도 완성된 동작을 보지 않았기 때문**이다.
//
// 고치기만 하면 다음에 또 생긴다(lessons-learned L-13: 규칙을 주석으로만 두면 어긴다).
// 그래서 규칙을 검사로 만든다:
//
//   오류를 삼킬 거면, 사용자에게 알리든가 왜 삼키는지 적어라.
//
// 허용 목록 대신 "설명 주석"을 인정하는 이유: 조용히 무시하는 게 옳은 경우가 실제로 많다
// (localStorage 접근 불가, 스프라이트 폴백, XP 적립 실패). 그때 필요한 건 예외 등재가 아니라
// **판단의 근거를 남기는 것**이고, 그러면 목록을 따로 관리할 필요도 없다.
//
// 한계(정직하게): 이건 소스 텍스트 검사지 의미 분석이 아니다. `// TODO` 한 줄로도 통과한다.
// 목적은 "몰래 삼키는 것"을 막는 게 아니라 **무심코 삼키는 것**을 막는 데 있다.

// 사용자에게 무언가를 전달하거나, 처리를 상위로 넘기는 호출들.
// 새 알림 수단을 만들면 여기 추가한다(추가를 잊으면 검사가 실패하므로 조용히 새지 않는다).
import { stripComments } from "./stripComments";

const INFORMS =
  /setError|setActionError|setState\(\s*["']error["']\s*\)|showError|setNote|flashMsg|setVersionMsg|setStandupError|console\.(error|warn)|\bthrow\b|\breturn\b/;

const HAS_COMMENT = /\/\/|\/\*/;

export type SilentCatch = { line: number; body: string };

/**
 * 한 파일의 소스에서 "알리지도 설명하지도 않는" catch 블록을 찾는다.
 * 중괄호 깊이로 본문을 잘라낸다 — 정규식으로 자르면 중첩 블록에서 엉뚱한 범위를 잡는다.
 */
export function findSilentCatches(source: string): SilentCatch[] {
  // 주석 속 문구("예전엔 } catch { ... } 였다")를 진짜 catch로 오인하지 않으려면 정제본에서
  // **찾아야** 하지만, 이 규칙의 통과 조건 하나가 "주석으로 사유를 남겼는가"라서 **판정은
  // 원본으로** 해야 한다. 정제기가 길이를 보존하므로 같은 오프셋으로 원본을 읽을 수 있다.
  const scan = stripComments(source);

  const found: SilentCatch[] = [];
  const re = /\bcatch\s*(\([^)]*\))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scan)) !== null) {
    const open = scan.indexOf("{", m.index);
    let depth = 0;
    let close = -1;
    for (let i = open; i < scan.length; i += 1) {
      if (scan[i] === "{") depth += 1;
      else if (scan[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close === -1) break; // 짝이 안 맞는 소스 — 파서가 아니므로 조용히 멈춘다.
    const body = source.slice(open + 1, close);
    if (INFORMS.test(body) || HAS_COMMENT.test(body)) continue;
    found.push({
      line: source.slice(0, m.index).split("\n").length,
      body: body.split(/\s+/).join(" ").trim().slice(0, 100),
    });
  }
  return found;
}
