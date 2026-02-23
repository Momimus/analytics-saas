import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import AppHeader from "./layout/AppHeader";
import { useTheme } from "../context/theme";

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoggedIn = Boolean(user);

  const navItems = useMemo(
    () => {
      if (!isLoggedIn) {
        return [
          { to: "/login", label: "Login" },
          { to: "/register", label: "Register" },
        ];
      }

      if (user?.role === "ADMIN") {
        return [
          { to: "/admin/analytics", label: "Analytics" },
          { to: "/admin/users", label: "Users" },
          { to: "/profile", label: "Profile" },
        ];
      }

      return [{ to: "/profile", label: "Profile" }];
    },
    [isLoggedIn, user?.role]
  );

  const isActivePath = useCallback((path: string) => {
    if (path === "/admin" && location.pathname.startsWith("/admin")) return true;
    if (path === "/profile" && location.pathname.startsWith("/profile")) return true;
    return location.pathname === path;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/admin/analytics")) return "Analytics";
    if (location.pathname.startsWith("/admin/audit-logs")) return "Audit Logs";
    if (location.pathname.startsWith("/admin/users")) return "Admin Users";
    if (location.pathname.startsWith("/admin")) return "Admin";
    if (location.pathname.startsWith("/profile")) return "Profile";
    if (location.pathname.startsWith("/register")) return "Create Account";
    if (location.pathname.startsWith("/forgot-password")) return "Forgot Password";
    if (location.pathname.startsWith("/reset-password")) return "Reset Password";
    return "Workspace";
  }, [location.pathname]);

  const mobileSidebarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!mobileSidebarRef.current) return;
      if (!mobileSidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  const desktopNavItems = navItems.map((item) => ({
    ...item,
    active: isActivePath(item.to),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader
        isLoggedIn={isLoggedIn}
        role={user?.role ?? null}
        userEmail={user?.email ?? null}
        theme={theme}
        pageTitle={pageTitle}
        navItems={desktopNavItems}
        onNavigate={(path) => navigate(path)}
        onToggleMobileMenu={() => setIsSidebarOpen((prev) => !prev)}
        onToggleTheme={toggleTheme}
        onLogout={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
      />

      <main className="page-fade scroll-gutter-stable mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={mobileSidebarRef}
          className={`absolute left-0 top-16 h-[calc(100dvh-4rem)] w-72 border-r border-[color:var(--border)] bg-[color:var(--surface)]/92 p-4 shadow-[var(--shadow-card)] transition-transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text)]">Navigation</p>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]"
            >
              Close
            </button>
          </div>

          <div className="grid gap-2">
            {navItems.map((item) => {
              const isActive = isActivePath(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`rounded-[var(--radius-md)] px-4 py-3 text-base font-semibold transition ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}

            {isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className="flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-left text-base font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)] hover:bg-[color:var(--surface-strong)]"
                >
                  <span>Theme</span>
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
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setIsSidebarOpen(false);
                    navigate("/login", { replace: true });
                  }}
                  className="rounded-[var(--radius-md)] px-4 py-3 text-left text-base font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)] hover:bg-[color:var(--surface-strong)]"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
