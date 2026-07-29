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
import {
  clearNotifyHistory,
  readNotifyHistory,
  NOTIFY_OUTCOME_LABELS,
  type NotifyHistoryEntry,
} from "@/lib/notifyHistory";

type Perm = NotificationPermission | "unsupported" | null;

// 기기 로컬 기록이라 표시 시각도 기기 시간대가 맞다.
function historyTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// Phase 12 T4 브라우저 알림 설정. 권한 상태를 보여주고, 미허용이면 켜기 버튼으로 요청한다.
// 실제 알림 발송은 오리 이벤트(레벨 업 등)에서 notifyDuck이 방해금지·일일 상한을 지켜 처리한다.
export function NotifySetting() {
  const [perm, setPerm] = useState<Perm>(null);
  // 2026-07-29 (Phase 56 T1 M-031): 테스트 발송 결과. "왜 안 오는지"를 화면이 말해준다.
  const [testResult, setTestResult] = useState<string | null>(null);
  // 2026-07-29 (Phase 56 T1 M-028): 최근 알림 기록 — "아까 왜 안 왔는지"의 사후 답.
  const [history, setHistory] = useState<NotifyHistoryEntry[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 클라이언트 전용: 마운트 후 1회
    setHistory(readNotifyHistory());
  }, []);

  function handleTest() {
    const reason = notifyBlockReason();
    if (reason !== null) {
      // 발송(notifyDuck)과 같은 판정 한 벌 — 진단은 상한을 소모하지 않는다.
      setTestResult(NOTIFY_BLOCK_MESSAGES[reason]);
      return;
    }
    notifyDuck("테스트 알림", "이렇게 도착해요. 꽥");
    setTestResult("테스트 알림을 보냈어요. 화면 구석에 떴는지 확인해 주세요.");
    // 방금 남은 기록까지 다시 읽는다.
    setHistory(readNotifyHistory());
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

        {/* 최근 기록(M-028) — 발송/차단 사유가 시각과 함께 남는다. 최근 8건만 보여준다. */}
        {history.length > 0 && (
          <div className="mt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">최근 알림 기록</span>
              <button
                type="button"
                onClick={() => {
                  clearNotifyHistory();
                  setHistory([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                지우기
              </button>
            </div>
            <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
              {history.slice(0, 8).map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  {`${historyTime(e.at)} ${e.title} — ${NOTIFY_OUTCOME_LABELS[e.outcome]}`}
                </li>
              ))}
            </ul>
          </div>
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
