"use client";

// 2026-07-29 : 설정 - 데이터 절약 모드 (Phase 56 T2 T-009)
// 무료 티어 대역폭(5GB/월) 대책. 켜면 대화의 사진을 누를 때만 불러온다.

import { useEffect, useState } from "react";
import { getDataSaver, setDataSaver } from "@/lib/dataSaverPref";

export function DataSaverSetting() {
  const [on, setOn] = useState<boolean | null>(null);

  // localStorage는 클라이언트 전용이라 마운트 후 1회 읽는다(SendKeySetting과 같은 방식).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setOn(getDataSaver());
  }, []);

  if (on === null) return <p className="text-sm text-muted-foreground">확인 중...</p>;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => {
            setOn(e.target.checked);
            setDataSaver(e.target.checked);
          }}
          className="size-4 accent-primary"
        />
        대화의 사진을 누를 때만 불러오기
      </label>
      <p className="text-xs text-muted-foreground break-keep">
        이 기기에만 적용됩니다. 사진 모아보기와 확대 보기는 평소처럼 동작해요.
        이미 열려 있는 대화 화면은 새로 열어야 반영돼요.
      </p>
    </div>
  );
}
