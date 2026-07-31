"use client";

import { useEffect, useRef, useState } from "react";
import { disableFocusMode, enableFocusMode } from "@/lib/focusMode";
import { Play, Square, Timer } from "lucide-react";
import {
  completePomodoro,
  listPomodoroSessions,
  startPomodoro,
} from "@ldd/api";
import { findResumablePomodoro, type PomodoroSession } from "@ldd/core";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/timeAgo";
import { createClient } from "@/lib/supabase/client";
import { emitXpChanged } from "@/lib/xpSignal";
import { recordToDuckRoom } from "@/lib/duckRoomLog";
import { onAppAction } from "@/lib/appActionSignal";
import { todayIso } from "@/lib/today";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WidgetSkeleton } from "@/components/Skeleton";
import {
  notifyDuck,
  notifyPermission,
  notifySupported,
  requestNotifyPermission,
} from "@/lib/notify";

// 2026-07-27 : 뽀모도로 - 완료 알림 (2차 피드백 1-4, Phase 44 T1)
// **계획의 `[추정]`을 코드로 확정했다: 이 소리는 한 번도 난 적이 없을 가능성이 매우 높다.**
// 전에는 완료 시점에 `new AudioContext()`를 만들었는데, 브라우저는 **사용자 제스처 없이 만든
// 컨텍스트를 `suspended`로 시작**시킨다. 타이머 만료는 제스처가 아니다.
// 게다가 완료할 때마다 새 컨텍스트를 만들고 닫지 않아 누수까지 있었다.
//
// 고친 방식: **컨텍스트를 시작 버튼(진짜 제스처) 때 한 번 만들어 재사용**한다.
// 그러면 `suspended`도 누수도 함께 사라진다 — 새 파일도 새 의존성도 필요 없다.
//
// **소리 자체는 합성음으로 남긴다(정직하게).** 계획은 실제 음원 파일로 바꾸라고 했지만
// `public/sounds/`에 있는 CC0 자산 7개는 문·발소리·타이핑이라 알람으로 쓸 것이 없고,
// 외부에서 새 자산을 내려받는 것은 라이선스 확인이 필요해 이번 범위 밖으로 뒀다.
// 대신 단발 삐 소리를 **두 음 차임**으로 바꿨다 — 이 저장소가 "사인파를 이상한 사운드로
// 지적받아 걷어낸" 전례가 있어서, 알람처럼 들리는 형태로 다듬었다.
let sharedAudioCtx: AudioContext | null = null;

// 사용자 제스처(시작 버튼) 안에서 부른다. 이미 있으면 재사용하고, 정지 상태면 깨운다.
function primeAudio(): void {
  if (typeof window === "undefined") return;
  try {
    sharedAudioCtx ??= new AudioContext();
    if (sharedAudioCtx.state === "suspended") void sharedAudioCtx.resume();
  } catch {
    // 오디오를 못 쓰는 환경(정책·권한)에서도 타이머 자체는 돌아야 한다.
  }
}

function playCompletionSound(): void {
  const ctx = sharedAudioCtx;
  // 제스처 때 만들어 두지 못했으면 소리를 포기한다 — 여기서 새로 만들어 봐야
  // `suspended`로 시작해 어차피 들리지 않는다(그게 전에 있던 결함이다).
  if (!ctx || ctx.state !== "running") return;
  // 두 음(높은音 → 낮은音)으로 짧게. 단발 삐 소리보다 "끝났다"로 들린다.
  const notes: { freq: number; at: number }[] = [
    { freq: 880, at: 0 },
    { freq: 587, at: 0.18 },
  ];
  for (const note of notes) {
    const osc = ctx.createOscillator();
    osc.type = "triangle"; // 사인보다 덜 날카롭다
    osc.frequency.value = note.freq;
    const gain = ctx.createGain();
    const start = ctx.currentTime + note.at;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.36);
  }
}

// 소리 끄기(기기별 취향이라 localStorage). 오피스 사운드에도 같은 스위치가 있다.
const MUTE_KEY = "ldd-pomodoro-muted";
function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

// 2026-07-27 (Phase 51 T2): 집중 모드 플래그를 lib/focusMode로 옮겼다.
// 여기 있던 주석은 "다른 컴포넌트가 이 이벤트를 수신해 알림을 억제한다"고 적혀 있었는데
// **읽는 곳이 0곳이었다** — 켜도 알림이 그대로 떴다. 이제 notifyDuck이 직접 본다.

type LoadState = "loading" | "error" | "ready";

// 선택 가능한 집중 길이(분) 프리셋. 기본값은 25분. 그 외 값은 "직접"에서 1~180 입력.
const DURATION_OPTIONS = [15, 25, 50] as const;
const DEFAULT_DURATION = 25;
const MIN_DURATION = 1;
const MAX_DURATION = 180; // core pomodoroSessionSchema와 동일 상한
const SECONDS_PER_MINUTE = 60;

// 태그 이력 localStorage 키. max 20개 보관.
const TAGS_KEY = "ldd-pomodoro-tags";

function getSavedTags(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function saveTag(tag: string): void {
  const tags = getSavedTags().filter((t) => t !== tag);
  tags.unshift(tag);
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags.slice(0, 20)));
}

function formatMmss(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / SECONDS_PER_MINUTE)).padStart(
    2,
    "0",
  );
  const ss = String(totalSeconds % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ISO 시각의 "로컬" 달력 날짜("YYYY-MM-DD"). completed_at은 UTC(Z)로 저장되므로
// slice(0,10)로 자르면 자정 부근에서 하루가 밀 수 있어, 로컬 기준으로 변환해 비교한다.
// sv-SE 로케일은 ISO 형식(YYYY-MM-DD)을 로컬 타임존으로 반환한다.
function localDateIso(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

// 완료 시각을 "N분 전", "N시간 전" 형식으로 변환한다.
export function PomodoroWidget() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_DURATION);
  // "직접" 커스텀 입력값(문자열로 관리 — 빈칸 허용). 커밋 시 clamp.
  const [customInput, setCustomInput] = useState("");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  // 소리 끄기. 초기값을 렌더 중에 읽으면 서버 렌더와 어긋나 하이드레이션이 깨진다.
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setMuted(isMuted());
  }, []);
  const toggleMuted = () => {
    setMuted((prev) => {
      const next = !prev;
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      return next;
    });
  };
  const [actionError, setActionError] = useState<string | null>(null);

  // 태그 입력 상태
  const [tagInput, setTagInput] = useState("");
  const [tagFocused, setTagFocused] = useState(false);
  const tagWrapperRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const fetchSessions = async () => {
    try {
      const data = await listPomodoroSessions(supabase);
      setSessions(data);
      setState("ready");
      return data;
    } catch {
      setState("error");
      return null;
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회(오늘 완료 집계용). 재시도는 reload가 담당.
    // 2026-07-26: 조회한 김에 **진행 중이던 세션을 이어받는다.** 그 전에는 새로고침 한 번에
    // 타이머가 사라지고 completed_at이 null인 행만 남았다 — 사용자는 시간도 XP도 잃었다.
    // 상태 변경은 async 콜백 안에서만 한다(이펙트 본문 동기 setState 회피 — 이 파일의 기존 관례).
    void (async () => {
      const data = await fetchSessions();
      if (!data) return;
      const resumable = findResumablePomodoro(data, Date.now());
      if (!resumable) return;
      setActiveId(resumable.id);
      setRemaining(resumable.remainingSeconds);
      setRunning(true);
      enableFocusMode();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // 2026-07-26 (피드백 1-4): 오리가 승인 실행으로 타이머를 시작·중지했을 때 이 화면이 따라간다.
  // 같은 탭이라 서버를 한 바퀴 돌 필요가 없다(pomodoro_sessions는 realtime 대상도 아니다).
  useEffect(() => {
    return onAppAction(["startPomodoro", "stopPomodoro"], () => {
      void (async () => {
        const data = await fetchSessions();
        if (!data) return;
        const resumable = findResumablePomodoro(data, Date.now());
        if (resumable) {
          setActiveId(resumable.id);
          setRemaining(resumable.remainingSeconds);
          setRunning(true);
          enableFocusMode();
          return;
        }
        // 오리가 끝냈다 — 화면도 멈춘다. 집중 모드 플래그가 남으면 다른 화면이 계속 숨는다.
        setRunning(false);
        setActiveId(null);
        setRemaining(0);
        disableFocusMode();
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 구독은 마운트 시 1회
  }, []);

  // 카운트다운: running일 때만 인터벌을 돌리고, 정지/언마운트 시 정리한다.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // 컴포넌트 언마운트 시 집중 모드 플래그가 남지 않도록 정리한다.
  useEffect(() => {
    return () => {
      disableFocusMode();
    };
  }, []);

  // 0초 도달 시 완료 처리. 상태 변경은 async 콜백 안에서만 해 이펙트 본문 동기 setState를 피한다.
  // 완료 후 running/activeId를 내려 재진입을 막고, cancelled 가드로 언마운트 경쟁을 막는다.
  useEffect(() => {
    if (!running || remaining > 0 || !activeId) return;
    const id = activeId;
    let cancelled = false;
    (async () => {
      try {
        await completePomodoro(supabase, id);
        if (cancelled) return;
        disableFocusMode();
        setRunning(false);
        setActiveId(null);
        if (!muted) playCompletionSound();
        // **알림은 새로 만들지 않는다** — `notifyDuck`이 권한·방해금지 시간대·하루 총량을
        // 이미 전부 판정한다(재구현은 인벤토리 위반이고, 판정이 두 벌이면 한쪽만 고쳐진다).
        notifyDuck("집중 시간이 끝났어요", "뽀모도로 한 판을 마쳤습니다. 잠깐 쉬어 가세요.");
        setCelebrate(true);
        await fetchSessions();
        // completePomodoro가 서버에서 XP를 적립하므로 오리 표시 갱신 신호를 보낸다.
        emitXpChanged();
        // 2026-07-29 (Phase 59 T1 S-009): 오리 방에 하루의 기록을 남긴다 —
        // 방이 없으면 스킵, 실패도 조용히(lib 계약). 완료 처리와는 무관하게 뒤에서.
        void recordToDuckRoom(supabase, "뽀모도로 집중 한 판을 마쳤어요.");
      } catch {
        if (!cancelled) {
          disableFocusMode();
          setRunning(false);
          setActiveId(null);
          setActionError("완료 처리하지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSessions/supabase는 안정적이라 의도적으로 제외
  }, [running, remaining, activeId]);

  const reload = () => {
    setState("loading");
    fetchSessions();
  };

  const handleStart = async () => {
    // 오디오 컨텍스트는 **이 제스처 안에서** 만들어야 소리가 난다(위 주석 참조).
    primeAudio();
    // 알림 권한도 여기서 묻는다 — 페이지 로드 시 물으면 사용자는 반사적으로 거부하고,
    // 한 번 거부되면 브라우저 설정을 직접 열기 전에는 되돌릴 수 없다.
    if (notifySupported() && notifyPermission() === "default") {
      void requestNotifyPermission();
    }
    setActionError(null);
    setCelebrate(false);
    const tag = tagInput.trim() || null;
    if (tag) saveTag(tag);
    try {
      const session = await startPomodoro(supabase, { durationMinutes, tag });
      setActiveId(session.id);
      setRemaining(durationMinutes * SECONDS_PER_MINUTE);
      setRunning(true);
      enableFocusMode();
    } catch {
      setActionError("시작하지 못했습니다.");
    }
  };

  // 정지/취소: 완료 처리하지 않는다. 시작된 세션 행은 completed_at null(중단)로 남는다.
  const handleStop = () => {
    setRunning(false);
    setActiveId(null);
    setRemaining(0);
    disableFocusMode();
  };

  const todaySessions = sessions.filter(
    (s) => s.completedAt && localDateIso(s.completedAt) === todayIso(),
  );
  const todayCount = todaySessions.length;
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // 최근 완료 세션 최대 5개 (completed_at 기준 내림차순은 listPomodoroSessions의 started_at 정렬 덕분에 유지됨)
  const recentCompleted = sessions
    .filter((s) => s.completedAt !== null)
    .slice(0, 5);

  // 자동완성 후보: 입력값을 포함하는 저장 태그 최대 5개
  const tagSuggestions =
    tagFocused && tagInput
      ? getSavedTags()
          .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()))
          .slice(0, 5)
      : [];

  return (
    <Card data-testid="pomodoro-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <Timer className="size-4 text-primary-accent" />
          뽀모도로
        </CardTitle>
        {state === "ready" && (
          <div className="flex items-center gap-1.5">
            <Badge variant="muted">오늘 {todayCount}회</Badge>
            {todayMinutes > 0 && (
              <span className="text-xs text-muted-foreground">오늘 {todayMinutes}분 집중</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}

        {running ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p
              aria-live="polite"
              className="font-mono text-5xl font-semibold tabular-nums tracking-tight"
            >
              {formatMmss(remaining)}
            </p>
            <Badge variant="muted" className="text-xs">
              집중 모드
            </Badge>
            <p className="text-sm text-muted-foreground">
              오리가 함께 집중 중...
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleStop}
              className="w-full"
            >
              <Square className="fill-current" />
              정지
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {celebrate && (
              <div className="rounded-lg bg-success/12 px-3 py-2 text-center text-sm font-medium text-success">
                집중 완료! 오리가 뿌듯해합니다.
              </div>
            )}
            {/* 2026-07-27 (2차 피드백 1-4): 소리 끄기. 알림이 생겼으니 끌 수단도 함께 준다 —
                오피스 사운드에도 같은 스위치가 있다(요청에는 없지만 소리는 늘 끌 수 있어야 한다). */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleMuted}
                aria-pressed={muted}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {muted ? "완료음 켜기" : "완료음 끄기"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">집중 길이</span>
              {/* 2026-07-29 (사용자 피드백: 뽀모도로 UI 깨짐): flex-wrap이 좁은 카드에서
                  "직접" 칸만 둘째 줄로 밀어 깨져 보였다. 4칸 고정 그리드 — 폭과 무관하게 정렬. */}
              <div className="grid w-full grid-cols-4 gap-1 rounded-lg bg-muted p-1">
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(min);
                      setCustomInput("");
                    }}
                    aria-pressed={durationMinutes === min && customInput === ""}
                    className={cn(
                      "rounded-md px-2 py-1 text-center text-sm font-medium transition-colors",
                      durationMinutes === min && customInput === ""
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {min}분
                  </button>
                ))}
                {/* 직접 입력(1~180분) — 프리셋 외 값 선택.
                    2026-07-31 (사용자 피드백: "뽀모도로에 직접입력 부분 깨짐"): 4칸 균등 그리드의
                    마지막 칸에 w-8(32px) 입력창과 "분" 글자를 나란히 넣어 자리표시 "직접"이 잘리고
                    "직 분"으로 보였다. 단위는 옆 프리셋(15분·25분·50분)이 이미 알려주므로 "분"을
                    떼고 입력창이 칸을 다 쓰게 한다. */}
                <span
                  className={cn(
                    "flex items-center justify-center rounded-md px-1 py-1 text-sm font-medium transition-colors",
                    customInput !== "" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <input
                    type="number"
                    min={MIN_DURATION}
                    max={MAX_DURATION}
                    inputMode="numeric"
                    value={customInput}
                    placeholder="직접"
                    aria-label="집중 길이 직접 입력(분)"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCustomInput(raw);
                      const n = Number(raw);
                      if (raw !== "" && Number.isFinite(n)) {
                        setDurationMinutes(
                          Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(n))),
                        );
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground"
                  />
                </span>
              </div>
            </div>

            {/* 태그 입력 + 자동완성 드롭다운 */}
            <div ref={tagWrapperRef} className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onFocus={() => setTagFocused(true)}
                onBlur={() => setTagFocused(false)}
                placeholder="태그 (선택)"
                maxLength={50}
                className="w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute top-full z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {tagSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      // onMouseDown: blur 이전에 실행돼 tagFocused가 false가 되기 전에 값을 채운다.
                      onMouseDown={() => setTagInput(t)}
                      className="block w-full px-2 py-1 text-left text-xs hover:bg-accent"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button type="button" onClick={handleStart} className="w-full">
              <Play className="fill-current" />
              시작
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {state === "loading" && <WidgetSkeleton />}
          {state === "error" && (
            <span className="flex items-center gap-2">
              집계를 불러오지 못했습니다.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reload}
              >
                다시 시도
              </Button>
            </span>
          )}
        </div>

        {/* 최근 완료 세션 이력 */}
        {recentCompleted.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">최근 기록</p>
            <ul className="flex flex-col gap-0.5">
              {recentCompleted.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-foreground">
                      {s.durationMinutes}분
                    </span>
                    {s.tag && (
                      <span className="truncate text-muted-foreground">
                        #{s.tag}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pl-2">
                    {s.completedAt ? timeAgo(s.completedAt) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
