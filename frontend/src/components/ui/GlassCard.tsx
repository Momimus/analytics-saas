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
      className={`rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-panel)] p-4 shadow-[var(--ui-shadow-sm)] backdrop-blur-md transition duration-[var(--ui-motion-normal)] md:p-5 ${className ?? ""}`}
    >
      {(title || subtitle || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
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
