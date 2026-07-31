import path from "node:path";

// 2026-07-31 : e2e - 인증세션 - 경로만 따로 (모듈 캐시 오염 차단)
// `authState.ts`는 **불러오는 순간** 파일을 읽어 판정을 상수(`AUTH_STATE`)에 굳힌다.
// globalSetup이 그 모듈을 불러 쓰면, 세션을 만들기 **전에** 굳은 "쓸 수 없음" 판정이 캐시에
// 남아 같은 프로세스에서 뒤이어 로드되는 스펙까지 그 값을 본다 — 세션을 새로 만들어 놓고도
// 44건이 전부 스킵된다(실측으로 겪었다).
//
// 그래서 **경로만** 여기 둔다. globalSetup은 이 파일만 불러 판정 모듈을 건드리지 않고,
// 판정은 스펙이 불러올 때(=세션이 만들어진 뒤) 처음 일어난다.
// 경로를 두 벌로 복사하지 않는 이유는 이 저장소의 상습 결함(L-21 복사-드리프트) 그대로다.
export const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
