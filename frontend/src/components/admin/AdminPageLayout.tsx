import type { PropsWithChildren, ReactNode } from "react";
import {
  adminPageStackClass,
  cardHeaderClass,
  pageSubtitleClass,
  pageTitleClass,
  sectionSubtitleClass,
  sectionTitleClass,
} from "../../lib/uiClasses";

type AdminPageProps = PropsWithChildren<{
  className?: string;
}>;

type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  compact?: boolean;
};

export function AdminPage({ className, children }: AdminPageProps) {
  return <div className={`${adminPageStackClass} ${className ?? ""}`}>{children}</div>;
}

export function AdminPageHeader({ title, subtitle, aside, compact = false }: AdminPageHeaderProps) {
  return (
    <header className={cardHeaderClass}>
      <div>
        <h1 className={compact ? sectionTitleClass : pageTitleClass}>{title}</h1>
        {subtitle ? <p className={compact ? sectionSubtitleClass : pageSubtitleClass}>{subtitle}</p> : null}
      </div>
      {aside}
    </header>
  );
}

