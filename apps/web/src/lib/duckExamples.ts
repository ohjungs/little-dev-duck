// 2026-07-26 : 오리 - 대화창 - 예시문구
// 오리는 도구를 6종 갖고 있는데(할 일 추가·완료, 메모, 페이지, 일정, 습관 체크) 대화창 안내엔
// 예시가 둘뿐이었고 둘 다 긴 문장이었다. 짧은 명령("장보기 추가")이 이제 동작하게 됐지만
// 사용자가 그걸 알 방법이 없다 — 쓸 수 있는데 아무도 모르는 기능은 없는 것과 같다.
//
// **예시는 반드시 실제로 동작해야 한다.** 같은 날 그 반대가 일어났다: 명세에 적힌 트리거 문장이
// 라우터에서 캔 답변으로 새어 도구가 한 번도 불리지 않았다. 그래서 예시마다 라우팅을
// 테스트로 검사한다(duckExamples.test.ts).

export type DuckExampleKind = "ask" | "create" | "check";

export type DuckExample = {
  text: string;
  kind: DuckExampleKind;
};

export const DUCK_EXAMPLES: readonly DuckExample[] = [
  { text: "이번 주 마감 뭐 있어?", kind: "ask" },
  { text: "장보기 추가", kind: "create" },
  { text: "내일 3시 회의 잡아줘", kind: "create" },
  { text: "운동 체크해", kind: "check" },
];
