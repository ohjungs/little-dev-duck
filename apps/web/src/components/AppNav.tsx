"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
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
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-3 md:flex">
      <div className="py-2">
        <Brand />
      </div>

      <div className="mt-2 px-0.5">
        <SearchTrigger />
      </div>

      <nav className="mt-2 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4", active && "text-primary-accent")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            <Image
              src="/duck-logo.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <WalkingModeToggle />
          <form action="/auth/logout" method="post" className="ml-auto">
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function AppMobileBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
