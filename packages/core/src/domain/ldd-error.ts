// 앱 전역 통일 에러 타입(Phase 8 게이트 T0-8). code로 분류하고 사용자 표시 메시지 + 원인을 보존한다.
// AI(Gemini 호출/네트워크/무료 티어 쿼터) 실패 경로가 늘어나는 Phase라 도입 — api·route·ai가 공유한다.
export type LddErrorCode =
  | "unauthorized" // 로그인/권한 없음
  | "invalid_input" // 입력 검증 실패
  | "not_found" // 대상 없음
  | "rate_limited" // 자체 레이트리밋 초과
  | "quota_exceeded" // 외부 무료 티어 쿼터 소진(폴백 트리거)
  | "upstream" // 외부 API(Gemini 등) 실패
  | "internal"; // 그 외 내부 오류

// code별 사용자 표시 기본 문구(내부 세부는 노출하지 않는다).
const DEFAULT_USER_MESSAGE: Record<LddErrorCode, string> = {
  unauthorized: "로그인이 필요합니다.",
  invalid_input: "입력을 확인해주세요.",
  not_found: "대상을 찾을 수 없습니다.",
  rate_limited: "요청이 많습니다. 잠시 후 다시 시도해주세요.",
  quota_exceeded: "지금은 AI 응답을 사용할 수 없어요. 잠시 후 다시 시도해주세요.",
  upstream: "외부 서비스 응답에 실패했습니다.",
  internal: "잠시 문제가 생겼어요. 다시 시도해주세요.",
};

export class LddError extends Error {
  readonly code: LddErrorCode;

  constructor(
    code: LddErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LddError";
    this.code = code;
  }
}

export function isLddError(value: unknown): value is LddError {
  return value instanceof LddError;
}

// 임의의 throw 값을 LddError로 정규화(외부 라이브러리가 던진 것 포함).
export function toLddError(value: unknown, fallbackCode: LddErrorCode = "internal"): LddError {
  if (isLddError(value)) return value;
  const message = value instanceof Error ? value.message : String(value);
  return new LddError(fallbackCode, message, value);
}

// 사용자에게 보여줄 안전한 메시지. LddError면 code 기본 문구, 아니면 internal 문구.
export function userMessage(value: unknown): string {
  if (isLddError(value)) return DEFAULT_USER_MESSAGE[value.code];
  return DEFAULT_USER_MESSAGE.internal;
}
