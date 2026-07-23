"use client";

import { useEffect, useRef } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const W = 800;
const H = 800;

// Phase 12 T5 공유용 성과 카드. 오리 + 레벨/XP를 Canvas 2D로 그려 PNG로 저장(라이브러리 없음, ponytail).
// duck-logo.png는 같은 origin이라 캔버스가 taint되지 않아 toBlob 가능.
export function AchievementCard({
  level,
  xp,
  feed,
  onClose,
}: {
  level: number;
  xp: number;
  feed: number;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // 배경: 머스타드 그라디언트(브랜드 팔레트).
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#fde68a");
    g.addColorStop(1, "#ca8a04");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#1c1917";

    ctx.font = "bold 120px system-ui, sans-serif";
    ctx.fillText(`Lv ${level}`, W / 2, 470);

    ctx.font = "40px system-ui, sans-serif";
    ctx.fillText(`XP ${xp}  ·  먹이 ${feed}`, W / 2, 545);

    ctx.font = "30px system-ui, sans-serif";
    ctx.fillStyle = "#44403c";
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;
    ctx.fillText("Little Dev Duck", W / 2, 700);
    ctx.fillText(dateStr, W / 2, 745);

    // 오리 로고(비동기 로드 후 위에 덮어 그린다).
    const img = new Image();
    img.onload = () => ctx.drawImage(img, W / 2 - 130, 90, 260, 260);
    img.src = "/duck-logo.png";
  }, [level, xp, feed]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "little-dev-duck-성과.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="성과 카드"
    >
      <div
        role="presentation"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full max-w-xs rounded-xl"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" /> 닫기
          </Button>
          <Button type="button" size="sm" onClick={download}>
            <Download className="size-4" /> 이미지 저장
          </Button>
        </div>
      </div>
    </div>
  );
}
