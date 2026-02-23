import { Link } from "react-router-dom";
import UserMenuDropdown from "./UserMenuDropdown";

type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

type NavItem = {
  to: string;
  label: string;
  active: boolean;
};

type AppHeaderProps = {
  isLoggedIn: boolean;
  role: Role | null;
  userEmail?: string | null;
  theme: "dark" | "light";
  pageTitle: string;
  navItems: NavItem[];
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  onToggleMobileMenu: () => void;
  onToggleTheme: () => void;
};

export default function AppHeader({
  isLoggedIn,
  role,
  userEmail,
  theme,
  pageTitle,
  navItems,
  onNavigate,
  onLogout,
  onToggleMobileMenu,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-panel)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)] shadow-[var(--shadow-accent)]">
            AS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text)] sm:text-base">Analytics SaaS</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{pageTitle}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {!isLoggedIn &&
            navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  item.active
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "text-[var(--text-muted)] hover:bg-[color:var(--surface)] hover:text-[var(--text)]"
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] text-[var(--text)] transition hover:bg-[color:var(--surface-strong)] lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] text-[var(--text)] transition hover:bg-[color:var(--surface-strong)]"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
              </svg>
            )}
          </button>

          {isLoggedIn && role ? (
            <>
              <UserMenuDropdown
                role={role}
                userEmail={userEmail ?? null}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onToggleTheme={onToggleTheme}
              />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
