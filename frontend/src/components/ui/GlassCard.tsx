import type { PropsWithChildren, ReactNode } from "react";
import { cardHeaderClass, cardShellClass, sectionSubtitleClass, sectionTitleClass } from "../../lib/uiClasses";

type GlassCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}>;

export default function GlassCard({ title, subtitle, actions, className, children }: GlassCardProps) {
  return (
    <section
      className={`${cardShellClass} ${className ?? ""}`}
    >
      {(title || subtitle || actions) && (
        <header className={cardHeaderClass}>
          <div className="grid gap-1">
            {title && <h2 className={sectionTitleClass}>{title}</h2>}
            {subtitle && <p className={sectionSubtitleClass}>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
