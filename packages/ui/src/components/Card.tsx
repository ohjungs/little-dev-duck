import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ style, ...props }: CardProps) {
  return (
    <div
      {...props}
      style={{
        background: "var(--ldd-color-surface)",
        color: "var(--ldd-color-text-on-accent)",
        borderRadius: "12px",
        padding: "1rem",
        ...style,
      }}
    />
  );
}
