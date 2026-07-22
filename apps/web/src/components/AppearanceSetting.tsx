"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark";

// 사이드바 ThemeToggle과 같은 저장소("ldd-theme" + .dark 클래스)를 공유해 어디서 바꿔도 일관된다.
export function AppearanceSetting() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(localStorage.getItem("ldd-theme") === "dark" ? "dark" : "light");
  }, []);

  const apply = (next: Mode) => {
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("ldd-theme", next);
  };

  const options: { value: Mode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "라이트", icon: Sun },
    { value: "dark", label: "다크", icon: Moon },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => apply(value)}
            aria-pressed={active}
            className={cn(
              "relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
              active
                ? "border-primary-accent ring-2 ring-primary/30"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            <span
              className={cn(
                "flex h-16 items-center justify-center rounded-lg",
                value === "light"
                  ? "bg-[#faf9f4] text-[#a16207]"
                  : "bg-[#1a1712] text-[#eab308]",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="flex items-center justify-between text-sm font-medium">
              {label}
              {active && <Check className="size-4 text-primary-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
