// check-secrets.mjs는 의존성 없이 도는 순수 node 스크립트라 빌드 대상이 아니다.
// 하지만 packages/core의 회귀 테스트가 scanText를 import하므로 tsc가 타입을 요구한다(TS7016).
// 스크립트를 TS로 옮기면 CI에서 빌드 없이 못 돌리게 되므로, 선언만 여기 둔다.
export declare function scanText(
  text: string,
): { line: number; name: string }[];
