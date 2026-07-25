// 2026-07-25 : Modern Interiors(LimeZu) 캐릭터 스프라이트 기하 + 결정적 외형 배분.
// 순수 데이터/수학만 — Canvas·Image 참조 없음(브라우저 로딩·틴트는 apps/web/lib/office-characters.ts).
//
// 에셋 규격(실측): {Name}_idle_anim_16x16.png / {Name}_run_16x16.png = 384x32.
//   프레임 16(w) x 32(h), 한 줄에 24프레임 = 4방향 x 6프레임.
//   방향 순서(LimeZu 표준): down, up, left, right. (오프스크린 렌더로 검증 후 확정)

import type { DepartmentId } from "./office-department";

export const OFFICE_CHARACTERS = ["adam", "alex", "amelia", "bob"] as const;
export type OfficeCharacterId = (typeof OFFICE_CHARACTERS)[number];

// 프레임 기하
export const CHAR_FRAME_W = 16;
export const CHAR_FRAME_H = 32;
export const CHAR_FRAMES_PER_DIR = 6;
export const CHAR_DIR_ORDER = ["down", "up", "left", "right"] as const;
export type CharFacing = (typeof CHAR_DIR_ORDER)[number];

// 애니메이션 종류 — idle(자리/대기) / run(이동)
export type CharAnim = "idle" | "run";

// 캐릭터 스프라이트 시트 파일명. 에셋 규격(파일 상단 주석) 그대로:
//   idle -> {Name}_idle_anim_16x16.png / run -> {Name}_run_16x16.png (Name=첫 글자 대문자).
// 조용한 실패 표면 — 이름이 틀리면 로더가 catch로 무시하고 폴백 렌더러로 넘어가 화면으로만 발견된다.
// URL 경로(BASE)는 브라우저 로더의 몫이라 여기선 파일명만 결정론적으로 만든다.
export function characterSheetFileName(char: OfficeCharacterId, anim: CharAnim): string {
  const name = char.charAt(0).toUpperCase() + char.slice(1); // adam -> Adam
  const suffix = anim === "idle" ? "idle_anim" : "run";
  return `${name}_${suffix}_16x16.png`;
}

// facing -> 스트립 내 방향 슬롯(0-3)
export function charDirSlot(facing: CharFacing): number {
  const i = CHAR_DIR_ORDER.indexOf(facing);
  return i < 0 ? 0 : i;
}

// facing+frame -> 스트립 내 소스 X(px). frame은 0..(CHAR_FRAMES_PER_DIR-1)로 래핑.
export function charSourceX(facing: CharFacing, frame: number): number {
  const f = ((frame % CHAR_FRAMES_PER_DIR) + CHAR_FRAMES_PER_DIR) % CHAR_FRAMES_PER_DIR;
  return (charDirSlot(facing) * CHAR_FRAMES_PER_DIR + f) * CHAR_FRAME_W;
}

// ---------------------------------------------------------------------------
// 부서별 대표 캐릭터 + 개인별 색조로 35명이 서로 다르게 보이도록 결정적으로 배분한다.
// 4개 베이스 캐릭터 x 색조 팔레트 조합으로 중복을 최소화("직원이 다 똑같다" 해소).
// hue = 0이면 원본(틴트 없음).
// ---------------------------------------------------------------------------
export type CharacterLook = {
  character: OfficeCharacterId;
  hue: number; // hue-rotate 각도(도). 0이면 원본.
};

// 색조 팔레트 — 의상 색만 살짝 돌려 개성을 준다(과회전 시 피부색이 튀므로 완만한 각도 위주).
const HUE_PALETTE = [0, 35, 70, 120, 210, 300, 330] as const;

// 부서마다 시작 캐릭터를 다르게 해서 부서 간에도 인상이 갈리도록 한다.
const DEPT_BASE_CHAR: Record<DepartmentId, number> = {
  engineering: 0,
  marketing: 1,
  design: 2,
  hr: 3,
  finance: 0,
  sales: 1,
  support: 2,
  qa: 3,
  operations: 0,
};

// 부서 내 순번(indexInDept)과 전역 순번(globalIndex)으로 외형을 정한다.
// 같은 부서 내에서는 캐릭터와 색조가 매번 다르게 순환한다.
export function assignLook(
  department: DepartmentId,
  indexInDept: number,
  globalIndex: number,
): CharacterLook {
  const base = DEPT_BASE_CHAR[department] ?? 0;
  const charIdx = (base + indexInDept) % OFFICE_CHARACTERS.length;
  const character = OFFICE_CHARACTERS[charIdx] ?? "adam";
  // 색조는 전역 순번 기준으로 팔레트를 돌려 이웃과 겹치지 않게 한다.
  const hue = HUE_PALETTE[globalIndex % HUE_PALETTE.length] ?? 0;
  return { character, hue };
}
