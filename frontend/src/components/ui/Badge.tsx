import type { PropsWithChildren } from "react";

type BadgeProps = PropsWithChildren<{
  variant?: "count" | "status";
  tone?: "success" | "warn" | "warning" | "neutral";
  className?: string;
}>;

export default function Badge({ variant = "status", tone = "neutral", className, children }: BadgeProps) {
  const normalizedTone = tone === "warn" ? "warning" : tone;
  const toneClasses =
    normalizedTone === "success"
      ? "bg-[color:var(--ui-badge-success-bg)] text-[color:var(--ui-badge-success-text)] border-[color:var(--ui-badge-success-border)]"
      : normalizedTone === "warning"
        ? "bg-[color:var(--ui-badge-warning-bg)] text-[color:var(--ui-badge-warning-text)] border-[color:var(--ui-badge-warning-border)]"
        : "bg-[color:var(--ui-badge-neutral-bg)] text-[color:var(--ui-badge-neutral-text)] border-[color:var(--ui-badge-neutral-border)]";

  return (
    <span
      className={`ui-badge-enter inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[var(--ui-shadow-sm)] transition duration-[var(--ui-motion-fast)] ${variant === "count" ? "min-w-[1.9rem] justify-center font-bold" : ""} ${toneClasses} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
