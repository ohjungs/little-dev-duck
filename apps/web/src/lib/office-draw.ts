// 2026-07-24 : AC-4 - 16x16 pixel art duck + furniture drawing module
// Pure Canvas 2D — no React, no external dependencies. All drawings are procedural fillRect calls.
// TILE_SIZE = 16. One canvas pixel = one "art pixel" (camera transform handles scaling).
// 2026-07-24 : 스프라이트 기반 렌더링 함수 추가 (drawDuckSprite, drawFurnitureSprite)

// ---------------------------------------------------------------------------
// Duck colors (character bible — DECISIONS.md §4)
// ---------------------------------------------------------------------------
const DC = {
  body: "#F6EFDD",
  shadow: "#E3D3B9",
  beak: "#E8A33C",
  beakDark: "#C47F2A",
  feet: "#E8A33C",
  eye: "#352116",
  outline: "#352116",
  crown: "#FFD700",
  crownGem: "#FF4444",
} as const;

// ---------------------------------------------------------------------------
// Duck draw options
// ---------------------------------------------------------------------------
export type DuckDrawOpts = {
  facing: "down" | "up" | "left" | "right";
  state: "idle" | "typing" | "walking" | "reading" | "server" | "question" | "offwork";
  frame: number; // 0-3 animation frame
  isBoss: boolean;
  accessory?: "glasses" | "hoodie" | "beret" | "tie" | "headset" | "badge" | "magnifier" | "clipboard";
  accessoryColor?: string;
  nameTag?: string;
};

// ---------------------------------------------------------------------------
// drawDuck — 16x16 pixel art duck
// x,y = top-left pixel position (canvas coords before camera scale)
// ---------------------------------------------------------------------------
export function drawDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  opts: DuckDrawOpts,
): void {
  const { facing, state, frame, isBoss, accessory, accessoryColor, nameTag } = opts;

  // Helper: fill a single pixel in the 16x16 grid
  const p = (gx: number, gy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx, y + gy, 1, 1);
  };
  // Helper: fill a rect in grid coords
  const r = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx, y + gy, gw, gh);
  };

  // Animation offsets
  const isTyping = state === "typing";
  const isWalking = state === "walking";
  const isSleeping = state === "offwork";

  // Vertical bob: typing bobs by 1px on odd frames, walking bobs 1px on frames 1,3
  const bob = (isTyping && frame % 2 === 1) ? 1 : (isWalking && frame % 2 === 1) ? 1 : 0;
  // Offset all body rows by bob
  const B = bob;

  // Ground shadow (row 15) — not affected by bob
  r(5, 15, 6, 1, "rgba(53,33,22,0.18)");

  // ---------------------------------------------------------------------------
  // Feet (row 14) — walk animation alternates left/right foot forward
  // ---------------------------------------------------------------------------
  if (!isSleeping) {
    const feetColor = DC.feet;
    if (isWalking) {
      // frame 0,2: left foot forward; frame 1,3: right foot forward
      const leftFwd = frame % 2 === 0;
      p(5, 14 + B, feetColor);
      p(6, 14 + B, feetColor);
      p(8, 14 + B, feetColor);
      p(9, 14 + B, feetColor);
      // Forward foot drops 1px
      if (leftFwd) {
        p(5, 15, feetColor);
      } else {
        p(8, 15, feetColor);
      }
    } else {
      // Static feet
      p(5, 14 + B, feetColor);
      p(6, 14 + B, feetColor);
      p(8, 14 + B, feetColor);
      p(9, 14 + B, feetColor);
    }
  } else {
    // Sleeping: feet tucked (just 2 small dots)
    p(6, 14, DC.feet);
    p(8, 14, DC.feet);
  }

  // ---------------------------------------------------------------------------
  // Body (rows 7-13)
  // ---------------------------------------------------------------------------
  // Body bottom outline
  r(5, 12 + B, 6, 2, DC.outline);
  // Body fill
  r(6, 8 + B, 5, 4, DC.body);
  r(5, 9 + B, 6, 3, DC.body);
  // Body bottom shadow (rows 11-12)
  r(6, 11 + B, 4, 1, DC.shadow);
  r(5, 12 + B, 6, 1, DC.shadow);

  // Wings (typing: wings forward = higher; else: tucked at sides)
  if (isTyping) {
    // Wings angled forward (rows 8-10)
    r(4, 8 + B, 1, 3, DC.outline);
    r(11, 8 + B, 1, 3, DC.outline);
    r(4, 8 + B, 1, 2, DC.shadow);
    r(11, 8 + B, 1, 2, DC.shadow);
  } else {
    // Normal wings
    r(4, 9 + B, 1, 3, DC.outline);
    r(11, 9 + B, 1, 3, DC.outline);
    r(4, 10 + B, 1, 2, DC.shadow);
    r(11, 10 + B, 1, 2, DC.shadow);
  }

  // Neck (rows 7-8)
  r(6, 7 + B, 4, 2, DC.body);
  r(5, 8 + B, 6, 1, DC.outline);

  // ---------------------------------------------------------------------------
  // Head (rows 2-6)
  // ---------------------------------------------------------------------------
  // Head outline block (5x5 centered at col 5-9)
  r(5, 2 + B, 6, 5, DC.outline);
  // Head fill (4x4 inside)
  r(6, 3 + B, 4, 3, DC.body);

  // ---------------------------------------------------------------------------
  // Facial features — vary by facing direction
  // ---------------------------------------------------------------------------
  if (facing === "down" || facing === "left" || facing === "right") {
    // Eye position depends on facing
    const eyeX = facing === "right" ? 8 : facing === "left" ? 6 : 7;
    const eyeX2 = facing === "right" ? 9 : facing === "left" ? 7 : 8;

    if (isSleeping) {
      // Sleeping eyes: two horizontal lines
      r(6, 4 + B, 4, 1, DC.eye);
    } else if (facing === "down") {
      // Two eyes facing forward
      p(eyeX, 4 + B, DC.eye);
      p(eyeX2, 4 + B, DC.eye);
    } else {
      // Side profile: one visible eye
      p(eyeX, 4 + B, DC.eye);
    }

    // Beak
    if (facing === "down") {
      // Beak below and center
      r(7, 5 + B, 2, 2, DC.beak);
      r(7, 6 + B, 2, 1, DC.beakDark);
    } else if (facing === "right") {
      // Beak points right
      r(10, 4 + B, 2, 1, DC.beak);
      p(11, 5 + B, DC.beakDark);
    } else {
      // Beak points left
      r(4, 4 + B, 2, 1, DC.beak);
      p(4, 5 + B, DC.beakDark);
    }
  } else {
    // facing === "up" — back of head, no eyes or beak visible
    // just a slightly different head top shade
    r(6, 2 + B, 4, 2, DC.shadow);
  }

  // ---------------------------------------------------------------------------
  // Boss crown (rows 0-1)
  // ---------------------------------------------------------------------------
  if (isBoss) {
    // Crown base bar
    r(5, 1 + B, 6, 1, DC.crown);
    // Crown tips (3 points)
    p(5, 0 + B, DC.crown);
    p(7, 0 + B, DC.crown);
    p(10, 0 + B, DC.crown);
    // Crown gem in center tip
    p(7, 0 + B, DC.crownGem);
  }

  // ---------------------------------------------------------------------------
  // Accessories (drawn on top of duck body)
  // ---------------------------------------------------------------------------
  if (accessory) {
    const aColor = accessoryColor ?? "#4A90D9";
    switch (accessory) {
      case "glasses":
        // Two 2px squares over eyes (rows 4)
        r(6, 4 + B, 2, 1, aColor);
        r(9, 4 + B, 2, 1, aColor);
        p(8, 4 + B, aColor); // bridge
        break;
      case "beret":
        // 4px hat on top-left of head (rows 1-2)
        r(5, 1 + B, 4, 2, aColor);
        r(5, 2 + B, 5, 1, DC.outline);
        break;
      case "tie":
        // 1px stripe down body center
        r(8, 8 + B, 1, 5, aColor);
        r(7, 9 + B, 2, 1, aColor); // knot
        break;
      case "headset":
        // 1px arc from ear over head
        r(5, 3 + B, 1, 2, aColor); // left arm
        r(10, 3 + B, 1, 2, aColor); // right arm
        r(5, 3 + B, 6, 1, aColor); // band over top
        break;
      case "badge":
        // 2x2 square on chest (row 9, left of center)
        r(6, 9 + B, 2, 2, aColor);
        p(6, 9 + B, "#FFFFFF"); // badge glint
        break;
      case "magnifier":
        // Small circle shape near hand area (right side)
        r(11, 8 + B, 2, 2, aColor);
        p(13, 10 + B, aColor); // handle
        break;
      case "clipboard":
        // Flat rect on left wing
        r(3, 8 + B, 2, 3, aColor);
        r(3, 8 + B, 2, 1, DC.outline);
        break;
      case "hoodie":
        // Hood on back of head
        r(5, 2 + B, 6, 2, aColor);
        r(4, 4 + B, 1, 2, aColor); // left side
        r(11, 4 + B, 1, 2, aColor); // right side
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Name tag (tiny text below the duck)
  // ---------------------------------------------------------------------------
  if (nameTag) {
    ctx.save();
    ctx.font = "3px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = DC.outline;
    ctx.fillText(nameTag, x + 8, y + tileSize + 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// drawFloorTile — floor surface (Floor, Corridor, Carpet, Door base)
// ---------------------------------------------------------------------------
export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileType: number,
  tileSize: number,
  col: number,
  row: number,
  carpetColor?: string,
): void {
  const even = (col + row) % 2 === 0;

  // 0 Floor
  if (tileType === 0) {
    ctx.fillStyle = even ? "#EFE9DC" : "#E7E0CF";
    ctx.fillRect(x, y, tileSize, tileSize);
    return;
  }
  // 4 Door — wood base
  if (tileType === 4) {
    ctx.fillStyle = "#D4A76A";
    ctx.fillRect(x, y, tileSize, tileSize);
    return;
  }
  // 5 Corridor
  if (tileType === 5) {
    ctx.fillStyle = even ? "#D4C9B0" : "#CCC0A8";
    ctx.fillRect(x, y, tileSize, tileSize);
    return;
  }
  // 6 Carpet
  if (tileType === 6) {
    // Floor base first
    ctx.fillStyle = even ? "#EFE9DC" : "#E7E0CF";
    ctx.fillRect(x, y, tileSize, tileSize);
    // Carpet color overlay at 30% opacity
    ctx.fillStyle = carpetColor ? carpetColor + "4D" : "rgba(74,144,217,0.30)";
    ctx.fillRect(x, y, tileSize, tileSize);
    return;
  }
  // Default: plain floor
  ctx.fillStyle = even ? "#EFE9DC" : "#E7E0CF";
  ctx.fillRect(x, y, tileSize, tileSize);
}

// ---------------------------------------------------------------------------
// drawFurniture — 16x16 pixel art for each TileType
// Call AFTER drawFloorTile so furniture sits on top.
// ---------------------------------------------------------------------------
export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileType: number,
  tileSize: number,
): void {
  // Helper scoped to tile
  const r = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx, y + gy, gw, gh);
  };
  const p = (gx: number, gy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + gx, y + gy, 1, 1);
  };

  switch (tileType) {
    // 1 Wall
    case 1:
      r(0, 0, tileSize, tileSize, "#5C5C5C");
      r(0, 0, tileSize, 2, "#7A7A7A"); // lighter top edge
      r(0, 0, 2, tileSize, "#6A6A6A"); // left edge
      break;

    // 2 Desk
    case 2:
      // Legs
      r(1, 10, 2, 6, "#6B4C28");
      r(13, 10, 2, 6, "#6B4C28");
      // Surface
      r(0, 8, tileSize, 3, "#B8860B");
      r(0, 10, tileSize, 1, "#8B6508"); // dark edge under surface
      break;

    // 3 Chair
    case 3:
      // Seat
      r(3, 9, 10, 4, "#7B5E3A");
      r(3, 12, 10, 1, "#5A4020"); // seat bottom edge
      // Backrest
      r(4, 4, 8, 5, "#7B5E3A");
      r(4, 4, 8, 1, "#5A4020"); // backrest top edge
      // Legs
      r(3, 13, 2, 3, "#5A4020");
      r(11, 13, 2, 3, "#5A4020");
      break;

    // 4 Door
    case 4:
      // Door panel
      r(2, 0, 12, tileSize, "#D4A76A");
      // Door frame
      r(2, 0, 1, tileSize, "#9B6B3A");
      r(13, 0, 1, tileSize, "#9B6B3A");
      r(2, 0, 12, 1, "#9B6B3A");
      // Handle
      r(11, 7, 2, 2, "#C0A040");
      break;

    // 5 Corridor — floor only, no furniture overlay
    case 5:
      break;

    // 6 Carpet — floor only
    case 6:
      break;

    // 7 Table (meeting table — slightly wider visual)
    case 7:
      // Table legs
      r(1, 11, 2, 5, "#6B4C28");
      r(13, 11, 2, 5, "#6B4C28");
      // Table surface
      r(0, 7, tileSize, 5, "#C49A30");
      r(0, 11, tileSize, 1, "#8B6508");
      break;

    // 8 Plant
    case 8:
      // Pot
      r(5, 11, 6, 5, "#8B5E3A");
      r(4, 12, 8, 3, "#8B5E3A");
      r(5, 15, 6, 1, "#5A3A1A"); // pot base
      // Soil
      r(5, 11, 6, 2, "#4A3020");
      // Stems
      r(7, 6, 1, 5, "#3A7A3A");
      r(9, 7, 1, 4, "#3A7A3A");
      r(5, 8, 1, 3, "#3A7A3A");
      // Leaves
      r(6, 4, 3, 3, "#4A9A4A");
      r(9, 5, 3, 3, "#4A9A4A");
      r(3, 6, 3, 3, "#4A9A4A");
      p(7, 4, "#5CB85C"); // highlight
      break;

    // 9 Bookshelf
    case 9:
      // Shelf frame
      r(1, 0, 14, tileSize, "#8B6040");
      r(0, 0, 1, tileSize, "#6B4020");
      r(15, 0, 1, tileSize, "#6B4020");
      // Shelf dividers
      r(1, 5, 14, 1, "#6B4020");
      r(1, 10, 14, 1, "#6B4020");
      // Book spines — top row
      r(2, 1, 2, 4, "#E74C3C");
      r(5, 1, 2, 4, "#3498DB");
      r(8, 1, 2, 4, "#2ECC71");
      r(11, 1, 2, 4, "#F39C12");
      r(13, 1, 2, 4, "#9B59B6");
      // Book spines — bottom row
      r(2, 6, 2, 4, "#1ABC9C");
      r(5, 6, 3, 4, "#E67E22");
      r(9, 6, 2, 4, "#E74C3C");
      r(12, 6, 2, 4, "#3498DB");
      // Bottom open space (decorative)
      r(2, 11, 12, 4, "#C49A30"); // small item/decor
      break;

    // 10 CoffeeMachine
    case 10:
      // Machine body
      r(3, 2, 10, 12, "#2C2C2C");
      r(3, 2, 10, 1, "#444"); // top
      // Water tank (lighter back)
      r(10, 3, 3, 5, "#3A3A3A");
      // Front panel
      r(4, 4, 6, 8, "#1A1A1A");
      // Red power light
      r(5, 5, 2, 2, "#FF2020");
      p(5, 5, "#FF6060"); // glint
      // Cup platform
      r(4, 13, 8, 1, "#444");
      r(5, 14, 6, 2, "#666");
      break;

    // 11 Whiteboard
    case 11:
      // Board
      r(1, 1, 14, 13, "#EEEEEE");
      // Frame
      r(0, 0, 16, 1, "#888");
      r(0, 14, 16, 1, "#888");
      r(0, 0, 1, 15, "#888");
      r(15, 0, 1, 15, "#888");
      // Legs
      r(4, 14, 1, 2, "#888");
      r(11, 14, 1, 2, "#888");
      // Marker lines (suggestion of writing)
      r(3, 4, 7, 1, "#6699CC");
      r(3, 7, 5, 1, "#6699CC");
      r(3, 10, 8, 1, "#CC6666");
      // Eraser tray
      r(1, 13, 14, 1, "#CCC");
      break;

    // 12 Server
    case 12:
      // Rack body
      r(2, 0, 12, tileSize, "#303030");
      r(2, 0, 12, 1, "#444");
      r(14, 0, 1, tileSize, "#222");
      // Unit slots
      r(3, 2, 10, 2, "#222");
      r(3, 5, 10, 2, "#222");
      r(3, 8, 10, 2, "#222");
      r(3, 11, 10, 2, "#222");
      // Green LED dots
      p(12, 3, "#00FF44");
      p(12, 6, "#00FF44");
      p(12, 9, "#00AA44");
      p(12, 12, "#00FF44");
      // Ventilation lines
      r(4, 14, 8, 1, "#222");
      break;

    // 13 Reception
    case 13:
      // Counter base
      r(0, 6, tileSize, 10, "#9B6B3A");
      // Counter top surface
      r(0, 5, tileSize, 2, "#C49A60");
      r(0, 6, tileSize, 1, "#8B5A2B"); // edge shadow
      // Front face bevel
      r(0, 7, 1, 9, "#7A4A2A");
      // Small sign holder on counter
      r(6, 3, 4, 3, "#DDDDDD");
      r(6, 3, 4, 1, "#AAAAAA");
      r(7, 4, 2, 1, "#888888"); // text suggestion
      // Bell
      r(13, 3, 2, 3, "#C0A040");
      r(13, 5, 2, 1, "#8B6508");
      break;

    // 14 Monitor
    case 14:
      // Stand base
      r(6, 14, 4, 2, "#2C2C2C");
      r(5, 13, 6, 1, "#222");
      // Stand neck
      r(7, 10, 2, 4, "#333");
      // Monitor frame
      r(2, 2, 12, 10, "#2C2C2C");
      r(3, 3, 10, 8, "#1565C0"); // blue screen
      // Screen content suggestion
      r(4, 4, 4, 1, "#4A90D9");
      r(4, 6, 6, 1, "#4A90D9");
      r(4, 8, 3, 1, "#4A90D9");
      p(12, 11, "#00FF44"); // power LED
      break;

    // 15 Printer
    case 15:
      // Body
      r(2, 4, 12, 10, "#888888");
      r(2, 4, 12, 1, "#AAAAAA"); // top edge
      // Paper slot (top)
      r(4, 2, 8, 3, "#CCCCCC");
      r(5, 2, 6, 2, "#EEEEEE"); // paper
      // Output tray (bottom)
      r(3, 13, 10, 1, "#AAAAAA");
      r(4, 14, 8, 2, "#DDDDDD"); // output paper
      // Control panel
      r(9, 6, 4, 4, "#777777");
      p(10, 7, "#00CC44"); // green button
      p(12, 7, "#FF3333"); // red button
      p(10, 9, "#FFAA00"); // amber indicator
      break;

    // 16 Sofa
    case 16:
      // Base/legs
      r(1, 13, 3, 3, "#5A3A1A");
      r(12, 13, 3, 3, "#5A3A1A");
      // Seat cushion
      r(1, 9, 14, 5, "#9B7A50");
      r(1, 9, 14, 1, "#B08A60"); // cushion top
      r(1, 13, 14, 1, "#7A5A30"); // cushion bottom
      // Armrests
      r(1, 6, 2, 7, "#7A5A30");
      r(13, 6, 2, 7, "#7A5A30");
      r(1, 5, 2, 1, "#9B7A50"); // left armrest top
      r(13, 5, 2, 1, "#9B7A50"); // right armrest top
      // Backrest
      r(3, 4, 10, 5, "#9B7A50");
      r(3, 4, 10, 1, "#B08A60"); // backrest top
      // Cushion divider
      p(8, 9, "#7A5A30");
      p(8, 10, "#7A5A30");
      p(8, 11, "#7A5A30");
      p(8, 12, "#7A5A30");
      break;

    // 17 VendingMachine
    case 17:
      // Body
      r(2, 0, 12, tileSize, "#3A5A8A");
      r(2, 0, 12, 1, "#4A6A9A"); // top edge
      r(14, 0, 1, tileSize, "#2A4A7A"); // right shadow
      // Glass front
      r(3, 2, 9, 8, "#1A2A4A");
      // Product rows (colored items)
      r(4, 3, 2, 2, "#FF4444"); // red cans
      r(7, 3, 2, 2, "#FF9944"); // orange
      r(10, 3, 1, 2, "#44AA44"); // green
      r(4, 6, 2, 2, "#4444FF"); // blue
      r(7, 6, 2, 2, "#FF44FF"); // purple
      r(10, 6, 1, 2, "#FFFF44"); // yellow
      // Coin slot / buttons panel
      r(3, 11, 9, 4, "#2A3A5A");
      r(10, 11, 1, 1, "#CCCC00"); // coin slot
      r(4, 12, 1, 1, "#FF4444"); // button
      r(6, 12, 1, 1, "#44FF44");
      r(8, 12, 1, 1, "#4444FF");
      // Tray
      r(3, 14, 9, 2, "#2A4A7A");
      break;

    // 18 WaterCooler
    case 18:
      // Stand
      r(5, 11, 6, 5, "#CCCCCC");
      r(4, 13, 8, 2, "#BBBBBB");
      r(4, 15, 8, 1, "#AAAAAA"); // base
      // Jug
      r(4, 2, 8, 10, "#A0C8E8");
      r(5, 1, 6, 2, "#C0D8F0"); // jug neck/cap
      r(5, 1, 6, 1, "#FFFFFF"); // cap highlight
      r(4, 2, 8, 1, "#B8D0E8"); // jug shoulder
      // Water level
      r(5, 6, 6, 6, "#5AAAD0"); // water inside
      r(4, 11, 8, 1, "#88BBDD"); // water surface line
      // Dispenser taps
      r(4, 12, 2, 2, "#FF4444"); // hot (red)
      r(10, 12, 2, 2, "#4444FF"); // cold (blue)
      break;

    // 19 Toilet
    case 19:
      // Tank
      r(3, 2, 10, 5, "#EEEEEE");
      r(3, 2, 10, 1, "#FFFFFF");
      r(3, 6, 10, 1, "#DDDDDD"); // tank bottom
      // Bowl
      r(2, 7, 12, 8, "#EEEEEE");
      r(2, 7, 12, 1, "#FFFFFF");
      r(1, 9, 14, 5, "#F4F4F4"); // bowl oval
      r(3, 10, 10, 4, "#DDDDDD"); // bowl inside
      // Flush button
      p(8, 3, "#CCCCCC");
      // Seat outline
      r(2, 8, 12, 1, "#CCCCCC");
      break;

    // 20 Fridge
    case 20:
      // Body
      r(2, 0, 12, tileSize, "#E8E8E8");
      r(2, 0, 12, 1, "#FFFFFF"); // top edge
      r(14, 0, 1, tileSize, "#C8C8C8"); // right shadow
      // Door divider (fridge/freezer split)
      r(2, 6, 12, 1, "#CCCCCC");
      // Handles
      r(11, 2, 1, 3, "#AAAAAA");
      r(11, 8, 1, 3, "#AAAAAA");
      // Brand accent
      r(3, 3, 6, 1, "#BBBBBB");
      // Foot
      r(3, 15, 3, 1, "#999999");
      r(10, 15, 3, 1, "#999999");
      break;

    // 21 Calendar
    case 21:
      // Frame
      r(2, 2, 12, 13, "#EEEEEE");
      r(2, 2, 12, 1, "#CCCCCC");
      r(1, 1, 14, 2, "#CC3333"); // red header band
      // Hanging rings
      p(5, 1, "#888888");
      p(10, 1, "#888888");
      // Day grid suggestion
      r(3, 5, 10, 1, "#DDDDDD");
      r(3, 7, 10, 1, "#DDDDDD");
      r(3, 9, 10, 1, "#DDDDDD");
      r(3, 11, 10, 1, "#DDDDDD");
      r(6, 5, 1, 8, "#DDDDDD");
      r(9, 5, 1, 8, "#DDDDDD");
      // Highlighted date
      r(7, 8, 2, 2, "#FF4444");
      break;

    // 22 Clock
    case 22:
      // Circle (approximate with rects)
      r(4, 0, 8, 1, "#333333");
      r(2, 1, 12, 1, "#333333");
      r(1, 2, 14, 12, "#333333");
      r(2, 14, 12, 1, "#333333");
      r(4, 15, 8, 1, "#333333");
      // Face fill
      r(2, 2, 12, 12, "#FFFFFF");
      r(3, 1, 10, 1, "#FFFFFF");
      r(1, 3, 1, 10, "#FFFFFF");
      r(14, 3, 1, 10, "#FFFFFF");
      // Hour markers (4 directions)
      p(8, 2, "#333");
      p(8, 13, "#333");
      p(2, 7, "#333");
      p(13, 7, "#333");
      // Hands
      r(7, 5, 2, 3, "#333333"); // hour hand (12 o'clock-ish)
      r(8, 7, 4, 1, "#333333"); // minute hand (3 o'clock-ish)
      // Center dot
      p(8, 7, "#333333");
      break;

    // 23 FireExtinguisher
    case 23:
      // Cylinder body
      r(5, 4, 6, 10, "#CC0000");
      r(5, 4, 6, 1, "#EE0000"); // top highlight
      r(10, 4, 1, 10, "#AA0000"); // right shadow
      // Neck
      r(6, 2, 4, 3, "#AA0000");
      r(6, 2, 4, 1, "#CC4444");
      // Nozzle / valve
      r(7, 1, 2, 2, "#888888");
      r(4, 2, 2, 1, "#888888"); // side tap
      // Hose
      r(4, 5, 1, 3, "#444444");
      r(3, 7, 2, 1, "#444444");
      r(3, 8, 1, 4, "#444444");
      // Label band
      r(5, 7, 6, 3, "#FFCCCC");
      r(6, 8, 4, 1, "#CC0000"); // text suggestion
      // Base
      r(4, 14, 8, 2, "#AA0000");
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// drawMinimap — 우상단 미니맵 오버레이 (단순 도트 렌더, 매 이동 시에만 호출)
// x, y = 캔버스 기준 미니맵 좌상단 좌표
// scale = 타일당 픽셀 수 (보통 2)
// ---------------------------------------------------------------------------
export type MinimapNpc = {
  tile: { x: number; y: number };
  department: string;
};

// 부서 ID -> 미니맵 도트 색상 (간결한 고정 팔레트)
const DEPT_DOT_COLOR: Record<string, string> = {
  engineering: "#4A90D9",
  marketing:   "#E8A33C",
  design:      "#9B59B6",
  hr:          "#2ECC71",
  finance:     "#1ABC9C",
  sales:       "#E74C3C",
  support:     "#F39C12",
  qa:          "#3498DB",
  operations:  "#E67E22",
};

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  map: { cols: number; rows: number; tiles: Uint8Array | number[] },
  playerTile: { x: number; y: number },
  npcs: MinimapNpc[],
  x: number,
  y: number,
  scale: number,
): void {
  const w = map.cols * scale;
  const h = map.rows * scale;

  // 반투명 배경
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  // 타일 — 벽(1)과 바닥을 구분하는 2색 렌더
  const tiles = map.tiles;
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const tt = tiles[row * map.cols + col];
      if (tt === 1) {
        // 벽
        ctx.fillStyle = "#5C5C5C";
      } else if (tt === undefined || tt === 0) {
        // 빈 공간 (맵 외부 포함)
        ctx.fillStyle = "rgba(0,0,0,0)";
        continue;
      } else {
        // 바닥/가구 등
        ctx.fillStyle = "#3A3A2E";
      }
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }

  // NPC 도트 (1x1 px 또는 scale이 2 이상이면 2x2)
  const dotSize = Math.max(1, scale - 1);
  for (const npc of npcs) {
    ctx.fillStyle = DEPT_DOT_COLOR[npc.department] ?? "#AAAAAA";
    ctx.fillRect(
      x + npc.tile.x * scale,
      y + npc.tile.y * scale,
      dotSize,
      dotSize,
    );
  }

  // 플레이어 도트 (밝은 흰색, 한 픽셀 더 크게)
  const pDot = Math.max(2, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(
    x + playerTile.x * scale - Math.floor((pDot - scale) / 2),
    y + playerTile.y * scale - Math.floor((pDot - scale) / 2),
    pDot,
    pDot,
  );

  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawDuckSprite — 스프라이트시트에서 오리 한 프레임을 캔버스에 그린다
// ducky_2/3_spritesheet.png: 192x128, 6열x4행, 프레임당 32x32
// 행: 0=down, 1=left, 2=right, 3=up
// 열: 0-5 = 애니메이션 프레임 (이동 0-3, 대기 0-1)
// x, y = 타일 좌상단 캔버스 좌표
// ---------------------------------------------------------------------------
export function drawDuckSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  x: number,
  y: number,
  tileSize: number,
  facing: "down" | "up" | "left" | "right",
  frame: number,
  scale: number = 1,
): void {
  const FRAME_W = 32;
  const FRAME_H = 32;
  const dirRow: Record<string, number> = { down: 0, left: 1, right: 2, up: 3 };
  const row = dirRow[facing] ?? 0;
  const col = frame % 6;

  const sx = col * FRAME_W;
  const sy = row * FRAME_H;
  const destSize = tileSize * scale;
  // 타일 중앙 하단에 발 맞춤
  const offsetX = (tileSize - destSize) / 2;
  const offsetY = tileSize - destSize;

  ctx.drawImage(
    sheet,
    sx, sy, FRAME_W, FRAME_H,
    x + offsetX, y + offsetY, destSize, destSize,
  );
}

// ---------------------------------------------------------------------------
// drawFurnitureSprite — 개별 가구 이미지를 타일에 맞춰 그린다
// 이미지 원본이 16px 이하면 1타일, 32px 이하면 2타일, 그 이상은 그대로 확대.
// ---------------------------------------------------------------------------
export function drawFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  tileSize: number,
): void {
  // naturalWidth 기준으로 표시 크기 결정 (16px -> 1타일, 32px -> 2타일)
  const naturalW = img.naturalWidth || img.width;
  const tiles = naturalW <= 16 ? 1 : naturalW <= 32 ? 2 : Math.ceil(naturalW / 16);
  const drawW = tileSize * tiles;
  const drawH = tileSize * tiles;
  ctx.drawImage(img, x, y, drawW, drawH);
}
