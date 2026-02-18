import type { PropsWithChildren, ReactNode } from "react";

type GlassCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}>;

export default function GlassCard({ title, subtitle, actions, className, children }: GlassCardProps) {
  return (
    <section
      className={`rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-panel)] p-3 shadow-[0_6px_16px_rgba(2,8,23,0.14)] backdrop-blur-md transition duration-[var(--ui-motion-normal)] sm:rounded-[var(--ui-radius-xl)] sm:p-4 sm:shadow-[var(--ui-shadow-sm)] ${className ?? ""}`}
    >
      {(title || subtitle || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
          <div className="grid gap-1">
            {title && <h2 className="text-base font-semibold tracking-tight text-[var(--ui-text-primary)] md:text-lg">{title}</h2>}
            {subtitle && <p className="text-sm text-[var(--ui-text-muted)]">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
