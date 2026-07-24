"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { createMemo, createPage, createTodo } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";
import { isOnboarded, setOnboarded } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/hooks/useModalA11y";

const SAMPLE_PAGE_CONTENT = [
  {
    type: "paragraph",
    content: [
      { type: "text", text: "환영합니다! 여기에 자유롭게 적어보세요.", styles: {} },
    ],
  },
];

// Phase 13 T1 온보딩 오버레이. 최초 방문 시 오리가 앱을 소개하고 샘플 데이터 생성을 제안한다.
// localStorage 플래그로 1회만. 샘플은 일반 투두/메모/페이지로 만들어 사용자가 지울 수 있다.
export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // localStorage는 클라이언트 전용이라 마운트 후 표시 여부를 결정한다(SSR에선 숨김).
  useEffect(() => {
    if (!isOnboarded()) setShow(true);
  }, []);

  const finish = () => {
    setOnboarded();
    setShow(false);
  };

  // Esc = 건너뛰기(finish: 온보딩 완료 표시 후 닫아 재안내 방지) + 포커스 진입/트랩/복원.
  const dialogRef = useModalA11y<HTMLDivElement>(show, finish);

  const createSamples = async () => {
    setCreating(true);
    try {
      const supabase = createClient();
      await Promise.all([
        createTodo(supabase, { title: "오리에게 인사하기" }),
        createMemo(supabase, {
          content: "첫 메모예요. 스티커처럼 붙여두세요.",
        }),
        createPage(supabase, {
          title: "첫 페이지",
          content: SAMPLE_PAGE_CONTENT,
        }),
      ]);
      setOnboarded();
      // 위젯들은 마운트 시 로드해 외부 생성분을 모르므로, 새로고침해 샘플이 바로 보이게 한다.
      window.location.reload();
    } catch {
      // 실패해도 온보딩은 마치고(재안내 방지) 사용자가 직접 만들 수 있게 닫는다.
      finish();
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="시작 안내"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl outline-none"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            <Image
              src="/duck-logo.png"
              alt=""
              width={48}
              height={48}
              className="size-12 object-cover"
            />
          </span>
          <div>
            <h2 className="text-lg font-semibold">
              {step === 0 ? "안녕하세요, 대장오리예요!" : "이렇게 시작해요"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 0
                ? "당신의 개인 워크스페이스에 함께할게요."
                : "필요한 만큼만, 천천히."}
            </p>
          </div>
        </div>

        {step === 0 ? (
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>· 홈 위젯에서 할 일·메모·커밋 잔디를 한눈에 봐요.</li>
            <li>· 오리는 상태에 반응하고, 물어보면 당신의 자료로 답해요.</li>
            <li>· 페이지에서 노션식 문서와 표/보드 데이터베이스를 만들어요.</li>
            <li>· 설정에서 외부 연동·방해금지·알림을 켤 수 있어요.</li>
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            샘플 할 일·메모·페이지를 하나씩 만들어 둘까요? 언제든 지울 수 있어요.
          </p>
        )}

        <div className="flex justify-end gap-2">
          {step === 0 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={finish}
              >
                건너뛰기
              </Button>
              <Button type="button" size="sm" onClick={() => setStep(1)}>
                다음
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={finish}
                disabled={creating}
              >
                빈 상태로 시작
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={createSamples}
                disabled={creating}
              >
                {creating && <Loader2 className="size-3.5 animate-spin" />}
                샘플 만들기
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
