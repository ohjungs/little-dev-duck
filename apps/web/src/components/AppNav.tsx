"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalkingModeToggle } from "@/components/WalkingModeToggle";
import { OPEN_SEARCH_EVENT } from "@/components/CommandPalette";
import { onTodosChanged } from "@/lib/todoSignal";

// 대시보드(할 일) 항목에 미완료 투두가 있을 때 빨간 점을 표시한다.
// todoSignal에 구독해 실시간으로 반영한다.
function usePendingTodos(): boolean {
  const [hasPending, setHasPending] = useState(false);
  useEffect(() => {
    return onTodosChanged((tally) => {
      setHasPending(tally.total > tally.done);
    });
  }, []);
  return hasPending;
}

const COLLAPSED_KEY = "sidebar-collapsed";

// 사이드바 접힘 상태를 localStorage에 영속한다.
// useState 지연 초기화로 SSR hydration mismatch 없이 클라이언트 값을 읽는다.
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };
  return [collapsed, toggle];
}

// 사이드바 검색 버튼: Cmd+K 팔레트를 CustomEvent로 연다(팔레트가 전역에서 수신).
function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">검색</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}

// 개인화/관리 메뉴 탭. 항목을 늘리려면 여기만 고치면 사이드바·모바일바 양쪽에 반영된다.
const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/pages", label: "페이지", icon: FileText },
  { href: "/insights", label: "통계", icon: BarChart3 },
  { href: "/news", label: "뉴스", icon: Newspaper },
  { href: "/office", label: "오피스", icon: Building2 },
  { href: "/settings", label: "설정", icon: Settings },
  { href: "/admin", label: "관리자", icon: ShieldCheck },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary/15 ring-1 ring-primary/25">
        <Image
          src="/duck-logo.png"
          alt=""
          width={24}
          height={24}
          className="size-6 object-contain"
        />
      </span>
      <span className="text-sm font-semibold tracking-tight">
        Little Dev Duck
      </span>
    </Link>
  );
}

export function AppSidebar({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();
  const hasPendingTodos = usePendingTodos();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden h-screen shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("py-2", collapsed && "flex justify-center")}>
        {collapsed ? (
          <Link href="/" className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <Image
              src="/duck-logo.png"
              alt="Little Dev Duck"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
          </Link>
        ) : (
          <Brand />
        )}
      </div>

      {!collapsed && (
        <div className="mt-2 px-0.5">
          <SearchTrigger />
        </div>
      )}

      <nav className="mt-2 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const showDot = item.href === "/" && hasPendingTodos;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed ? "justify-center gap-0" : "gap-2.5",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="relative shrink-0">
                <Icon
                  className={cn("size-4", active && "text-primary-accent")}
                />
                {showDot && (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
                )}
              </span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
        {/* 사용자 정보: 접힌 상태에서는 아바타만 표시 */}
        <div className={cn("flex items-center gap-2.5 px-1", collapsed && "justify-center")}>
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            <Image
              src="/duck-logo.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
            />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <WalkingModeToggle />
            <form action="/auth/logout" method="post" className="ml-auto">
              <Button type="submit" variant="ghost" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        )}
        {/* 사이드바 접기/펼치기 토글 */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

const MOBILE_NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/pages", label: "페이지", icon: FileText },
  { href: "/office", label: "오피스", icon: Building2 },
  { href: "/news", label: "뉴스", icon: Newspaper },
  { href: "/settings", label: "설정", icon: Settings },
];

export function AppMobileBar() {
  const pathname = usePathname();
  const hasPendingTodos = usePendingTodos();
  return (
    <nav
      aria-label="하단 탐색"
      className="no-print fixed bottom-0 left-0 right-0 z-30 flex min-h-14 justify-around border-t border-border bg-background/95 backdrop-blur-md pb-safe md:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const showDot = item.href === "/" && hasPendingTodos;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icon
                className={cn("size-5", active && "text-primary-accent")}
              />
              {showDot && (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
