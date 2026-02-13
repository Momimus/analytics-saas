import type { PropsWithChildren } from "react";

type BadgeProps = PropsWithChildren<{
  variant?: "count" | "status";
  tone?: "success" | "warn" | "neutral";
  className?: string;
}>;

export default function Badge({ variant = "status", tone = "neutral", className, children }: BadgeProps) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/20 text-emerald-200"
      : tone === "warn"
        ? "bg-rose-500/20 text-rose-200"
        : "bg-slate-500/20 text-slate-200";

  return (
    <span
      className={`ui-badge-enter inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold shadow-[var(--ui-shadow-sm)] transition duration-[var(--ui-motion-fast)] ${variant === "count" ? "min-w-[1.9rem] justify-center" : ""} ${toneClasses} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
