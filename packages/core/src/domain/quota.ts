// 2026-07-26 : AI - 무료쿼터 - 일일소진과분당제한구분
// Gemini 무료 티어의 429는 두 가지가 뭉쳐 있다: 분당 요청/토큰 제한과 **하루 총량** 제한.
// upstreamError는 둘 다 quota_exceeded 하나로 접었고, 사용자에게는 늘 "1분 정도 후 다시
// 시도해주세요"라고 안내했다. 하루 총량이 소진된 경우 이 안내는 **거짓이며**, 사용자는
// 하루 종일 재시도하다 "오리가 고장났다"고 결론짓는다.
//
// 판별은 429 본문의 quotaId로 한다(PerDay / PerMinute).
// [추정] 실제 429를 관측하려면 쿼터를 소진해야 해서 문서상 스키마를 근거로 했다. 빗나가면
// unknown으로 떨어지는데, unknown 메시지는 시간을 약속하지 않으므로 지금보다 나빠지지 않는다.

export type QuotaWindow = "minute" | "day" | "unknown";

/** 429 원문(내부용, 사용자에게 노출 금지)에서 어느 한도에 걸렸는지 판별한다. */
export function quotaWindow(rawMessage: string): QuotaWindow {
  // 분당·일일이 함께 걸릴 수 있다. 그때는 더 오래 기다려야 하는 day가 이긴다.
  if (/PerDay|per[\s-]?day|daily/i.test(rawMessage)) return "day";
  if (/PerMinute|per[\s-]?minute/i.test(rawMessage)) return "minute";
  return "unknown";
}

/** 사용자에게 보여줄 문구. 원문은 절대 섞지 않는다(로그 유출 방지). */
export function quotaWindowMessage(window: QuotaWindow): string {
  switch (window) {
    case "day":
      return "오늘 쓸 수 있는 AI 사용량을 다 썼어요. 내일 다시 도와드릴게요.";
    case "minute":
      return "지금 잠깐 요청이 몰렸어요. 1분 정도 후 다시 시도해주세요.";
    default:
      // 언제 풀릴지 모르면 **모른다고 둔다.** 지킬 수 없는 시간 약속이 더 나쁘다.
      return "지금은 AI 응답을 쓸 수 없어요. 조금 뒤에 다시 시도해주세요.";
  }
}
