"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  notifyBlockReason,
  notifyDuck,
  notifyPermission,
  notifySupported,
  requestNotifyPermission,
  NOTIFY_BLOCK_MESSAGES,
} from "@/lib/notify";
import { Button } from "@/components/ui/button";

type Perm = NotificationPermission | "unsupported" | null;

// Phase 12 T4 브라우저 알림 설정. 권한 상태를 보여주고, 미허용이면 켜기 버튼으로 요청한다.
// 실제 알림 발송은 오리 이벤트(레벨 업 등)에서 notifyDuck이 방해금지·일일 상한을 지켜 처리한다.
export function NotifySetting() {
  const [perm, setPerm] = useState<Perm>(null);
  // 2026-07-29 (Phase 56 T1 M-031): 테스트 발송 결과. "왜 안 오는지"를 화면이 말해준다.
  const [testResult, setTestResult] = useState<string | null>(null);

  function handleTest() {
    const reason = notifyBlockReason();
    if (reason !== null) {
      // 발송(notifyDuck)과 같은 판정 한 벌 — 진단은 상한을 소모하지 않는다.
      setTestResult(NOTIFY_BLOCK_MESSAGES[reason]);
      return;
    }
    notifyDuck("테스트 알림", "이렇게 도착해요. 꽥");
    setTestResult("테스트 알림을 보냈어요. 화면 구석에 떴는지 확인해 주세요.");
  }

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
      <div className="flex flex-col gap-2">
        <p className="text-sm text-foreground">
          알림이 켜져 있어요. 레벨 업 같은 순간에 오리가 알려드립니다(방해금지 시간대엔 조용).
        </p>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={handleTest}>
            <Bell className="size-3.5" /> 테스트 알림 보내기
          </Button>
        </div>
        {testResult && (
          <p role="status" className="text-xs text-muted-foreground break-keep">
            {testResult}
          </p>
        )}
      </div>
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
