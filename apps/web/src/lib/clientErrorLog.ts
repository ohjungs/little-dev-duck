// 2026-07-29 : 운영 - 클라이언트 에러 기록 (Phase 58 T2 V-007)
// 화면에 잠깐 떴다 사라지는 에러는 진단(T-027)이 못 본다. 계획: Sentry(외부 반출) 전에
// **자체 수집 먼저** — 기기별 localStorage 링(새 로그 테이블 금지, 서버 action_log는
// 서버 액션용 그대로). 메시지 문구만 남긴다 — 본문·개인 데이터는 에러 문구에 안 담는 것이
// 기존 규약이고, 여기서도 그 이상을 저장하지 않는다.

import { readRing, pushRing, clearRing } from "./localRing";

const KEY = "ldd:client-errors";
export const CLIENT_ERROR_CAP = 50;

export type ClientErrorEntry = { at: string; message: string };

function isEntry(v: unknown): v is ClientErrorEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as ClientErrorEntry).at === "string" &&
    typeof (v as ClientErrorEntry).message === "string"
  );
}

export function recordClientError(message: string): void {
  pushRing(KEY, { at: new Date().toISOString(), message }, CLIENT_ERROR_CAP, isEntry);
}

export function readClientErrors(): ClientErrorEntry[] {
  return readRing(KEY, isEntry);
}

export function clearClientErrors(): void {
  clearRing(KEY);
}
