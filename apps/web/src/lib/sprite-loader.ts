// 2026-07-24 : 스프라이트 에셋 — 이미지 로드 + SpriteAssets 번들

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}

export type SpriteAssets = {
  duckYellow: HTMLImageElement;  // ducky_2_spritesheet.png — 일반 직원
  duckBoss: HTMLImageElement;    // ducky_3_spritesheet.png — CEO
  furniture: Map<string, HTMLImageElement>;
};

// 가구 파일명 목록 — /sprites/furniture/{name}.png 형식
const FURNITURE_NAMES = [
  "Desk", "Desk-2", "Chair", "Chair-2",
  "Boss-Desk", "Boss-Chair",
  "Bookshelf", "Tall-Bookshelf",
  "Coffee-Machine", "Printer", "Big-Office-Printer",
  "Vending-Machine", "Water-Dispenser",
  "Big-Plant", "Small-Plant",
  "Big-Sofa", "Big-Sofa-2", "Small-Sofa",
  "Big-Round-Table", "Small-Table",
  "Bin", "Board", "Wall-Clock", "Wall-Graph",
  "Mirror", "Wall-Note", "Wall-Note-2", "Wall-Shelf",
  "Books", "Folders", "Folders-2", "Papers",
  "Toilet-Closed", "Toilet-Open",
  "Filing-Cabinet-Small", "Filing-Cabinet-Tall", "Filing-Cabinet-Open",
  "Big-Filing-Cabinet", "Wide-Filing-Cabinet",
  "Printer-Furniture", "WC-Sink", "WC-Paper",
] as const;

export async function loadAllSprites(): Promise<SpriteAssets> {
  const [duckYellow, duckBoss] = await Promise.all([
    loadImage("/sprites/duck/ducky_2_spritesheet.png"),
    loadImage("/sprites/duck/ducky_3_spritesheet.png"),
  ]);

  const furniture = new Map<string, HTMLImageElement>();
  await Promise.all(
    FURNITURE_NAMES.map(async (name) => {
      try {
        const img = await loadImage(`/sprites/furniture/${name}.png`);
        furniture.set(name, img);
      } catch {
        // 없는 파일은 건너뛴다 — drawFurniture가 fallback으로 처리
      }
    }),
  );

  return { duckYellow, duckBoss, furniture };
}
