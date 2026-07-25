import tseslint from "typescript-eslint";

// 2026-07-26 : 린트 - 날짜규칙 - toISOString슬라이스금지
// `x.toISOString().slice(0, 10)`은 **UTC 날짜**를 준다. 이 저장소는 이 한 줄 때문에 하루가
// 밀리는 버그를 2026-07-26 하루에만 8건 냈다(캘린더 표시·D-day, 통계 주간경계·스트릭·히트맵·
// 요일집계, 스탠드업 2곳). 사용자가 보는 "오늘"이 필요하면 로컬 포맷터를 쓴다:
//   클라이언트 → `todayIso()` / core `toLocalDateString(date)`
//   서버(UTC로 돈다) → core `kstDateString(now)`
//   타임스탬프에서 날짜만 → web `localDateKey(iso)`
// 정말 UTC 날짜가 맞는 자리에서만 eslint-disable로 **이유를 적고** 통과시킨다.
export const noUtcDateSlice = {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
        message:
          "toISOString().slice()는 UTC 날짜라 시간대만큼 하루가 밀립니다. 로컬은 todayIso()/toLocalDateString(), 서버는 kstDateString(), 타임스탬프→날짜는 localDateKey()를 쓰세요. UTC가 맞는 자리면 eslint-disable에 이유를 적어주세요.",
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
  ...tseslint.configs.recommended,
  noUtcDateSlice,
);
