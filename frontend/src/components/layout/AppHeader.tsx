import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import UserMenuDropdown from "./UserMenuDropdown";

type Role = "ADMIN";

type NavItem = {
  to: string;
  label: string;
  active: boolean;
};

type AppHeaderProps = {
  isLoggedIn: boolean;
  role: Role | null;
  userEmail?: string | null;
  pageTitle: string;
  navItems: NavItem[];
  headerControls?: ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  onToggleMobileMenu: () => void;
};

export default function AppHeader({
  isLoggedIn,
  role,
  userEmail,
  pageTitle,
  navItems,
  headerControls,
  onNavigate,
  onLogout,
  onToggleMobileMenu,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-topbar-bg)]/96 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {isLoggedIn ? (
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight text-[var(--ui-text-primary)]">{pageTitle}</p>
              <p className="truncate text-xs text-[var(--ui-text-muted)]">Admin Workspace</p>
            </div>
          ) : (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] text-sm font-semibold text-[var(--accent)]">
                AS
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text)] sm:text-base">Analytics SaaS</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{pageTitle}</p>
              </div>
            </>
          )}
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {!isLoggedIn &&
            navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  item.active
                    ? "bg-[color:var(--ui-accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[color:var(--surface-alt)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Toggle menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] text-[var(--text)] transition hover:bg-[color:var(--surface-alt)] lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
          {headerControls}

          {isLoggedIn && role ? (
            <>
              <UserMenuDropdown
                role={role}
                userEmail={userEmail ?? null}
                onNavigate={onNavigate}
                onLogout={onLogout}
              />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
