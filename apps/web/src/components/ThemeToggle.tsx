"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// 라이트가 기본. 선택은 localStorage에 보존. 다크 새로고침 시 미세 FOUC는 감수(라이트 기본이라 드묾).
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem("ldd-theme") === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ldd-theme", next ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={dark ? "라이트 모드로" : "다크 모드로"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
