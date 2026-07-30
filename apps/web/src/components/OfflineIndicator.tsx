"use client";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 초기 상태 동기화
    if (!navigator.onLine) setOffline(true);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    // 2026-07-30 : 전에는 순수 div라 붉은 띠가 **눈으로만** 보였다 — 스크린리더 사용자는
    // 연결이 끊긴 사실을 듣지 못했고, 오프라인은 이후 저장이 실패한다는 뜻이라 알려야 한다.
    // assertive(role="alert")가 아니라 polite(role="status"): 배너가 오프라인인 동안 계속
    // 떠 있어 공손한 알림도 놓치지 않고, 연결이 불안정해 온·오프가 반복될 때 읽던 문장을
    // 매번 끊는 편이 더 나쁘다.
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-xs py-1"
    >
      오프라인 상태입니다. 인터넷 연결을 확인해주세요.
    </div>
  );
}
