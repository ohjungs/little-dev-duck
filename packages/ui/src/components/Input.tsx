import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ style, ...props }: InputProps) {
  return (
    <input
      {...props}
      style={{
        background: "var(--ldd-color-bg)",
        color: "var(--ldd-color-text)",
        border: "1px solid var(--ldd-color-accent)",
        borderRadius: "6px",
        padding: "0.5rem",
        fontSize: "1rem",
        ...style,
      }}
    />
  );
}
