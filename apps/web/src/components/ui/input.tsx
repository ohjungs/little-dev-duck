import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
        "placeholder:text-muted-foreground",
        // 2026-07-31 : 접근성 - 포커스링 - 알파 금지 (SC 1.4.11)
        // 전에는 링에 40% 알파를 씌웠다 — 배경과 섞여 1.48:1이 된다. 링 색은 희석하지 않는다.
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
