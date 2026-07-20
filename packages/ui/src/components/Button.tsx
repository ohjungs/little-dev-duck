import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        background: "var(--ldd-color-accent)",
        color: "var(--ldd-color-text-on-accent)",
        border: "none",
        borderRadius: "8px",
        padding: "0.5rem 1rem",
        fontSize: "1rem",
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
