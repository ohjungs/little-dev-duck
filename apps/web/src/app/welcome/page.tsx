import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GitHubMark } from "@/components/ui/github-mark";

export const metadata = {
  title: "Little Dev Duck — 오리가 사는 개인 워크스페이스",
  description:
    "3D 아기오리 AI 비서가 상주하는 개인 워크스페이스. 위젯 대시보드, 노션급 블록 에디터, 내 자료로 답하고 실제 작업을 대신하는 오리.",
};

// Phase 13 T4: 비로그인 방문자용 공개 랜딩. 미들웨어가 인증 안 된 접근을 /welcome으로 보내고,
// 여기 CTA가 /login(OAuth)으로 잇는다. 앱 셸 밖 독립 라우트라 (app) 인증 가드를 타지 않는다.
const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "위젯 대시보드",
    body: "할 일·메모·커밋 잔디·습관을 한 화면에서. 필요한 것만, 산만하지 않게.",
  },
  {
    icon: Bot,
    title: "내 자료로 답하는 오리",
    body: "메모와 페이지를 알고 답하는 RAG 비서. 검색이 아니라 대화로 꺼내 씁니다.",
  },
  {
    icon: CalendarCheck,
    title: "실제로 일하는 에이전트",
    body: "일정 잡기, 이슈 만들기, 메일 정리까지. 승인 카드로 확인하고 오리가 대신 실행.",
  },
  {
    icon: FileText,
    title: "노션급 블록 에디터",
    body: "문서·표·보드 데이터베이스, 버전 기록과 전역 검색까지 갖춘 워크스페이스.",
  },
] as const;

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 상단 바 */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/duck-logo.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full ring-1 ring-border"
          />
          Little Dev Duck
        </span>
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          로그인
        </Link>
      </header>

      {/* 히어로 — 비대칭 편집형 */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-24 md:pt-14">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary-accent">
            <Sparkles className="size-3.5" />
            오리가 상주하는 개인 워크스페이스
          </span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            일은 당신이 정하고,
            <br />
            <span className="text-primary-accent">번거로운 건 오리</span>가.
          </h1>
          <p className="max-w-md text-base text-muted-foreground md:text-lg">
            3D 아기오리 AI 비서가 당신의 할 일·메모·페이지를 알고, 물어보면 답하고,
            외부 서비스에 실제 작업까지 대신합니다. 위젯 모드와 노션급 앱 모드를 오가며.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", className: "group" })}
            >
              오리와 시작하기
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <GitHubMark className="size-4" />
              Google·GitHub로 3초 로그인
            </span>
          </div>
        </div>

        {/* 오리 카드 — 레이어드 그림자 + 떠 있는 힌트 칩 */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" />
          <div className="rounded-[1.75rem] border border-border bg-card p-8 shadow-2xl">
            <div className="mx-auto flex aspect-square w-full max-w-[16rem] items-center justify-center rounded-2xl bg-secondary">
              <Image
                src="/duck-logo.png"
                alt="Little Dev Duck 마스코트"
                width={220}
                height={220}
                className="size-48 object-contain drop-shadow-md"
                priority
              />
            </div>
          </div>
          <div className="absolute -left-4 top-6 rotate-[-6deg] rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg">
            ✅ 오늘 할 일 3
          </div>
          <div className="absolute -right-3 bottom-8 rotate-[5deg] rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg">
            🔥 7일 연속 커밋
          </div>
        </div>
      </section>

      {/* 기능 베이토 */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary-accent transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 마감 CTA 밴드 */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 md:px-8">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-secondary/60 px-6 py-14 text-center">
          <h2 className="max-w-lg text-2xl font-bold tracking-tight md:text-3xl">
            오늘의 워크스페이스에 오리 한 마리를 들여보세요.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            무료로 시작하고, 필요한 만큼만 천천히. 데이터는 언제든 통째로 내보내거나 지울 수 있어요.
          </p>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", className: "group" })}
          >
            무료로 시작하기
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-muted-foreground md:flex-row md:px-8">
          <span>© 2026 Little Dev Duck</span>
          <span>개인 워크스페이스 · 오리 상주</span>
        </div>
      </footer>
    </div>
  );
}
