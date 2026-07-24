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
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-xs py-1">
      오프라인 상태입니다. 인터넷 연결을 확인해주세요.
    </div>
  );
}
