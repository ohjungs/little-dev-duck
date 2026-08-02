// 2026-08-02 : 스프레드시트 - 채우기 핸들의 연속 데이터 (SPEC T6 / AC-14)
//
// 끌었을 때 무엇을 채울지는 **원본이 무엇이었나**로 갈린다:
//   숫자가 둘 이상이고 간격이 일정하면 등차 → 이어서 센다
//   원본이 전부 같은 이름 목록(요일·월)에 있으면 그 목록을 이어간다
//   나머지는 순서대로 되풀이한다(수식은 여기 오지 않는다 — 참조를 옮겨야 하므로 화면이
//   shiftFormulaRefs로 따로 처리한다)
//
// 숫자 하나만 주면 늘리지 않고 되풀이한다. 엑셀과 같다 — "1"을 끌어 1,2,3이 되면 되풀이가
// 필요한 사람이 매번 Ctrl을 눌러야 하고, 어느 쪽이 기본인지는 엑셀이 이미 정해 뒀다.

// 목록은 "같은 목록의 항목끼리만" 이어진다. 짧은 이름과 긴 이름을 다른 목록으로 두는 이유:
// 섞어 쓰면 "월"의 다음이 "화요일"이 될 수 있다.
const SERIES: readonly (readonly string[])[] = [
  ["월", "화", "수", "목", "금", "토", "일"],
  ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"],
  ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
];

function findSeries(values: readonly string[]): readonly string[] | null {
  for (const list of SERIES) {
    if (values.every((v) => list.includes(v))) return list;
  }
  return null;
}

function asNumbers(values: readonly string[]): number[] | null {
  const out: number[] = [];
  for (const v of values) {
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out;
}

/** 간격이 일정한가. 부동소수 비교라 절대 오차가 아니라 크기에 견준다. */
function constantStep(nums: readonly number[]): number | null {
  if (nums.length < 2) return null;
  const step = nums[1] - nums[0];
  for (let i = 2; i < nums.length; i += 1) {
    const d = nums[i] - nums[i - 1];
    if (Math.abs(d - step) > Math.max(1e-9, Math.abs(step) * 1e-9)) return null;
  }
  return step;
}

// 0.1 + 0.2가 0.30000000000000004로 보이지 않게 유효숫자 15자리에서 끊는다(화면과 같은 규칙).
function numText(n: number): string {
  return String(Number(n.toPrecision(15)));
}

/**
 * 원본 값들에 이어 `count`칸을 채운다. 돌려주는 것은 **문자열**이다 —
 * 셀에 넣을 때 parseCellInput이 숫자·불리언 판정을 한 번만 하게 하려는 것이다.
 */
export function fillValues(source: readonly string[], count: number): string[] {
  if (count <= 0) return [];
  if (source.length === 0) return Array.from({ length: count }, () => "");

  const nums = asNumbers(source);
  if (nums) {
    const step = constantStep(nums);
    if (step !== null) {
      const last = nums[nums.length - 1];
      return Array.from({ length: count }, (_, i) => numText(last + step * (i + 1)));
    }
  }

  const list = findSeries(source);
  if (list) {
    // 원본이 하나면 한 칸씩, 둘 이상이면 그 간격만큼 건너뛴다(월,수 → 금,일).
    const idx = source.map((v) => list.indexOf(v));
    const step = idx.length >= 2 ? idx[1] - idx[0] : 1;
    const last = idx[idx.length - 1];
    const size = list.length;
    return Array.from({ length: count }, (_, i) => {
      // 음수 간격에서도 목록 안으로 접는다.
      const at = (((last + step * (i + 1)) % size) + size) % size;
      return list[at];
    });
  }

  return Array.from({ length: count }, (_, i) => source[i % source.length]);
}
