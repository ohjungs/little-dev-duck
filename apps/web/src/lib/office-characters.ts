// 2026-07-25 : Modern Interiors 캐릭터 스프라이트 로더 + 색조 틴트 캐시.
// 4개 베이스 캐릭터(Adam/Alex/Amelia/Bob) x (idle, run) 시트를 로드하고,
// NPC별 색조(hue)로 틴트한 오프스크린 캔버스를 캐시해 매 프레임 필터 없이 빠르게 그린다.

import {
  OFFICE_CHARACTERS,
  CHAR_FRAME_H,
  charSourceX,
  type OfficeCharacterId,
  type CharAnim,
  type CharFacing,
} from "@ldd/core";
import { loadImage } from "./sprite-loader";

const BASE = "/sprites/modern-interiors/characters";

// 캐릭터 파일명 매핑 — Adam_idle_anim_16x16.png / Adam_run_16x16.png
function sheetUrl(char: OfficeCharacterId, anim: CharAnim): string {
  const name = char.charAt(0).toUpperCase() + char.slice(1); // adam -> Adam
  const suffix = anim === "idle" ? "idle_anim" : "run";
  return `${BASE}/${name}_${suffix}_16x16.png`;
}

export type CharacterAssets = {
  // 원본 시트: char -> anim -> Image
  sheets: Map<string, HTMLImageElement>;
  // 틴트 캐시: `${char}:${anim}:${hue}` -> 틴트된 캔버스
  tintCache: Map<string, HTMLCanvasElement>;
  loaded: boolean;
};

function sheetKey(char: OfficeCharacterId, anim: CharAnim): string {
  return `${char}:${anim}`;
}

export async function loadCharacterAssets(): Promise<CharacterAssets> {
  const sheets = new Map<string, HTMLImageElement>();
  const anims: CharAnim[] = ["idle", "run"];

  await Promise.all(
    OFFICE_CHARACTERS.flatMap((char) =>
      anims.map(async (anim) => {
        try {
          const img = await loadImage(sheetUrl(char, anim));
          sheets.set(sheetKey(char, anim), img);
        } catch {
          // 개별 시트 로드 실패는 무시 — 폴백 렌더러가 처리
        }
      }),
    ),
  );

  return { sheets, tintCache: new Map(), loaded: sheets.size > 0 };
}

// 색조 틴트된 캔버스를 얻는다(캐시). hue=0이면 원본 이미지를 그대로 쓰므로 캐시 대신 null 반환.
function getTinted(
  assets: CharacterAssets,
  char: OfficeCharacterId,
  anim: CharAnim,
  hue: number,
): CanvasImageSource | null {
  const img = assets.sheets.get(sheetKey(char, anim));
  if (!img) return null;
  if (hue === 0) return img;

  const key = `${char}:${anim}:${hue}`;
  const cached = assets.tintCache.get(key);
  if (cached) return cached;

  const off = document.createElement("canvas");
  off.width = img.naturalWidth || img.width;
  off.height = img.naturalHeight || img.height;
  const octx = off.getContext("2d");
  if (!octx) return img;
  // hue-rotate는 명도를 보존해 픽셀아트 음영을 유지한 채 색상만 돌린다.
  octx.imageSmoothingEnabled = false;
  octx.filter = `hue-rotate(${hue}deg)`;
  octx.drawImage(img, 0, 0);
  assets.tintCache.set(key, off);
  return off;
}

// ---------------------------------------------------------------------------
// drawCharacter — NPC/플레이어 캐릭터 한 프레임을 그린다(전신 16x32, 잘림 없음).
// x,y = 캐릭터가 서 있는 타일의 좌상단 캔버스 좌표.
// 캐릭터는 전신 32px 높이라 머리가 타일 위로 올라가도록 위로 오프셋해 그린다.
// scale = 타일 대비 몸 크기 배율(1.4 권장 — 32px 타일에서 약간 크게).
// ---------------------------------------------------------------------------
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  assets: CharacterAssets,
  char: OfficeCharacterId,
  hue: number,
  x: number,
  y: number,
  tileSize: number,
  facing: CharFacing,
  frame: number,
  moving: boolean,
  isIdleDim: boolean,
): boolean {
  const anim: CharAnim = moving ? "run" : "idle";
  const src = getTinted(assets, char, anim, hue);
  if (!src) return false;

  // 스프라이트 시트에 명확한 우향 프레임이 없어(slot3가 정면처럼 보임) 좌향(slot2)을 수평 반전해
  // 우향으로 그린다 — 항상 올바른 좌우 프로필 보장.
  const flip = facing === "right";
  const srcFacing: CharFacing = flip ? "left" : facing;
  const sx = charSourceX(srcFacing, frame);
  const sw = 16;
  const sh = CHAR_FRAME_H; // 32

  // 전신 높이 = 타일 2배. 발이 타일 하단에 닿고 머리는 위 타일로 올라간다.
  const destW = tileSize; // 16px 폭 -> 타일 폭
  const destH = tileSize * 2; // 32px 높이 -> 타일 2칸
  const dx = x; // 폭이 타일과 같으므로 좌우 정렬 그대로
  const dy = y - tileSize; // 머리가 한 타일 위로

  if (isIdleDim) ctx.globalAlpha = 0.6;
  if (flip) {
    // 수평 반전: 목적지 중심 기준으로 뒤집어 그린다.
    ctx.save();
    ctx.translate(dx + destW, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(src, sx, 0, sw, sh, 0, 0, destW, destH);
    ctx.restore();
  } else {
    ctx.drawImage(src, sx, 0, sw, sh, dx, dy, destW, destH);
  }
  ctx.globalAlpha = 1;
  return true;
}
