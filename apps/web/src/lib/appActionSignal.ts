// 2026-07-26 : 오리 - 앱 액션 - 위젯 알림 (피드백 1-4)
// 오리가 승인 실행으로 데이터를 바꿨을 때, **같은 탭에 열려 있는 위젯**이 알아채게 한다.
//
// 왜 realtime이 아닌가: `pomodoro_sessions`는 realtime publication에 없고, 추가하려면
// 마이그레이션이 필요한데 그건 사용자 실행 대기 중이다(PENDING 1번). 그런데 오리 대화와 위젯은
// **같은 브라우저 탭**에서 돈다 — 서버를 한 바퀴 돌 이유가 없다.
// `xpSignal`이 이미 쓰는 네이티브 CustomEvent pub/sub과 같은 방식이다.
//
// 도구 이름을 실어 보낸다. 위젯마다 관심사가 달라서, 받는 쪽이 걸러야 무관한 재조회가 안 생긴다.

const APP_ACTION_EVENT = "ldd:app-action";

export function emitAppAction(toolNames: string[]): void {
  if (toolNames.length === 0) return;
  window.dispatchEvent(new CustomEvent(APP_ACTION_EVENT, { detail: toolNames }));
}

/** names 중 하나라도 실행됐을 때만 handler를 부른다. 반환값은 해제 함수. */
export function onAppAction(names: string[], handler: () => void): () => void {
  const listener = (e: Event) => {
    const executed = (e as CustomEvent<string[]>).detail;
    if (!Array.isArray(executed)) return;
    if (executed.some((n) => names.includes(n))) handler();
  };
  window.addEventListener(APP_ACTION_EVENT, listener);
  return () => window.removeEventListener(APP_ACTION_EVENT, listener);
}
