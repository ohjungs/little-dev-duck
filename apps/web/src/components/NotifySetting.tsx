"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  notifyPermission,
  notifySupported,
  requestNotifyPermission,
} from "@/lib/notify";
import { Button } from "@/components/ui/button";

type Perm = NotificationPermission | "unsupported" | null;

// Phase 12 T4 브라우저 알림 설정. 권한 상태를 보여주고, 미허용이면 켜기 버튼으로 요청한다.
// 실제 알림 발송은 오리 이벤트(레벨 업 등)에서 notifyDuck이 방해금지·일일 상한을 지켜 처리한다.
export function NotifySetting() {
  const [perm, setPerm] = useState<Perm>(null);

  // Notification API는 클라이언트 전용이라 마운트 후 1회 상태를 읽는다(SSR 불가).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setPerm(notifySupported() ? notifyPermission() : "unsupported");
  }, []);

  const enable = async () => {
    setPerm(await requestNotifyPermission());
  };

  if (perm === null) {
    return <p className="text-sm text-muted-foreground">확인 중...</p>;
  }
  if (perm === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        이 브라우저는 알림을 지원하지 않습니다.
      </p>
    );
  }
  if (perm === "granted") {
    return (
      <p className="text-sm text-foreground">
        알림이 켜져 있어요. 레벨 업 같은 순간에 오리가 알려드립니다(방해금지 시간대엔 조용).
      </p>
    );
  }
  if (perm === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        브라우저 설정에서 이 사이트의 알림을 허용해 주세요.
      </p>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={enable}>
      <Bell className="size-3.5" /> 브라우저 알림 켜기
    </Button>
  );
}
