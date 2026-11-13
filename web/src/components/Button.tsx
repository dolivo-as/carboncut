import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "small" | "danger";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const extra = variant === "primary" ? "" : variant;
  return (
    <button type={rest.type ?? "button"} className={["btn", extra, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
