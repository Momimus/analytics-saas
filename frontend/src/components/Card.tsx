import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{ className?: string; title?: string; subtitle?: string }>;

export default function Card({ className, title, subtitle, children }: CardProps) {
  return (
    <section
      className={`card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-card)] md:p-7 ${
        className ?? ""
      }`}
    >
      {(title || subtitle) && (
        <header className="mb-6">
          {title && <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
