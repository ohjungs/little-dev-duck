// 2026-07-26 : 페이지 - 가져오기 - 한글깨짐 (피드백 2-1)
// "존재하는 기능중 가져오기 이런걸보면 전부 글자가 깨지고, 이상해".
//
// 원인: 가져오기가 `File.text()`를 썼는데 이건 **무조건 UTF-8로 해석한다.**
// 한국어 Windows에서 메모장·구형 편집기로 저장한 .md는 대부분 CP949(EUC-KR 확장)라
// UTF-8로 읽으면 전부 깨진다. 파일 내용이 아니라 읽는 방식이 문제였다.
//
// 판별 방법(추측 아님): UTF-8은 자기검증형 인코딩이라 아무 바이트열이나 통과하지 않는다.
// `TextDecoder("utf-8", { fatal: true })`는 규격에 맞지 않는 바이트열에서 예외를 던지므로,
// 예외가 나면 UTF-8이 아니라는 뜻이고 그때만 CP949로 다시 읽는다.
// 즉 **정상 UTF-8 파일의 동작은 한 글자도 바뀌지 않는다.**
//
// 한계(정직하게): 짧은 CP949 문자열이 우연히 유효한 UTF-8이 되는 경우가 이론적으로 있다.
// 그때는 UTF-8로 읽히지만, 그건 지금과 같은 동작이라 나빠지지 않는다.

// BOM(바이트 순서 표식). 붙어 있으면 인코딩이 확정이고, 본문에서는 제거해야 한다
// (남기면 첫 글자 앞에 보이지 않는 문자가 들어가 제목 비교·검색이 어긋난다).
const BOM_UTF8 = [0xef, 0xbb, 0xbf];
const BOM_UTF16LE = [0xff, 0xfe];
const BOM_UTF16BE = [0xfe, 0xff];

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((b, i) => bytes[i] === b);
}

export type DecodedText = {
  text: string;
  // 실제로 사용한 인코딩. 화면에서 "CP949로 읽었어요"를 알릴 때 쓴다 —
  // 조용히 바꿔 읽으면 결과가 이상할 때 사용자가 원인을 알 수 없다.
  encoding: "utf-8" | "utf-16le" | "utf-16be" | "cp949";
};

// 텍스트 파일 바이트를 사람이 의도한 글자로 되돌린다. BOM 우선, 없으면 UTF-8, 실패 시 CP949.
export function decodeTextBytes(buffer: ArrayBuffer): DecodedText {
  const bytes = new Uint8Array(buffer);

  if (startsWith(bytes, BOM_UTF16LE)) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "utf-16le" };
  }
  if (startsWith(bytes, BOM_UTF16BE)) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "utf-16be" };
  }
  const body = startsWith(bytes, BOM_UTF8) ? bytes.subarray(3) : bytes;

  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(body), encoding: "utf-8" };
  } catch {
    // UTF-8이 아니다 — 이 저장소의 사용자 환경에서 다음으로 흔한 건 CP949다.
    // euc-kr 디코더는 CP949 확장 영역까지 처리한다(Encoding Standard).
    // 여기서 또 실패할 수는 없다(euc-kr 디코더는 fatal이 아니라 대체 문자를 넣는다).
    return { text: new TextDecoder("euc-kr").decode(body), encoding: "cp949" };
  }
}
