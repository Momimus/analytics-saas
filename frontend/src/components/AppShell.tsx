import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { apiFetch } from "../lib/api";
import {
  hasUnseenPendingRequests,
  type PendingAccessRequestsResponse,
  REQUESTS_SEEN_EVENT,
} from "../lib/pendingRequests";
import Badge from "./ui/Badge";
import NotificationDot from "./ui/NotificationDot";

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [pendingCount, setPendingCount] = useState(0);
  const [latestPendingAt, setLatestPendingAt] = useState<string | null>(null);
  const [showRequestsBadge, setShowRequestsBadge] = useState(false);
  const [pulseRequestsDot, setPulseRequestsDot] = useState(false);
  const previousPendingCountRef = useRef(0);

  const isLoggedIn = Boolean(user);
  const isInstructorRole = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  const navItems = useMemo(
    () => {
      if (!isLoggedIn) {
        return [
          { to: "/login", label: "Login" },
          { to: "/register", label: "Register" },
        ];
      }

      const items = [{ to: "/dashboard", label: "Home" }, { to: "/courses", label: "Courses" }];

      if (user?.role === "STUDENT") {
        items.push({ to: "/my-courses", label: "My Courses" });
      }

      items.push({ to: "/profile", label: "Profile" });

      if (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
        items.splice(1, 0, { to: "/instructor", label: "Instructor" });
        items.splice(2, 0, { to: "/instructor/requests", label: "Requests" });
      }

      return items;
    },
    [isLoggedIn, user?.role]
  );

  const refreshPendingRequests = useCallback(async () => {
    if (!isInstructorRole) {
      setPendingCount(0);
      setLatestPendingAt(null);
      setShowRequestsBadge(false);
      return;
    }
    try {
      const result = await apiFetch<PendingAccessRequestsResponse>("/instructor/requests?limit=1");
      setPendingCount(result.totalPending);
      setLatestPendingAt(result.latestPendingAt);
      setShowRequestsBadge(result.totalPending > 0 && hasUnseenPendingRequests(result.latestPendingAt));
    } catch {
      setPendingCount(0);
      setLatestPendingAt(null);
      setShowRequestsBadge(false);
    }
  }, [isInstructorRole]);

  useEffect(() => {
    const stored = localStorage.getItem("lms-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    } else {
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

  useEffect(() => {
    void refreshPendingRequests();
  }, [refreshPendingRequests]);

  useEffect(() => {
    if (!isInstructorRole) return;
    const interval = window.setInterval(() => {
      void refreshPendingRequests();
    }, 60000);
    const onFocus = () => {
      void refreshPendingRequests();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isInstructorRole, refreshPendingRequests]);

  useEffect(() => {
    const recomputeBadge = () => {
      setShowRequestsBadge(pendingCount > 0 && hasUnseenPendingRequests(latestPendingAt));
    };
    window.addEventListener(REQUESTS_SEEN_EVENT, recomputeBadge);
    window.addEventListener("storage", recomputeBadge);
    return () => {
      window.removeEventListener(REQUESTS_SEEN_EVENT, recomputeBadge);
      window.removeEventListener("storage", recomputeBadge);
    };
  }, [pendingCount, latestPendingAt]);

  useEffect(() => {
    const previous = previousPendingCountRef.current;
    if (pendingCount > previous) {
      setPulseRequestsDot(true);
      const timer = window.setTimeout(() => setPulseRequestsDot(false), 900);
      previousPendingCountRef.current = pendingCount;
      return () => window.clearTimeout(timer);
    }
    previousPendingCountRef.current = pendingCount;
  }, [pendingCount]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("lms-theme", next);
  };

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

  const isActivePath = (path: string) => {
    if (path === "/instructor/requests" && location.pathname.startsWith("/instructor/requests")) return true;
    if (path === "/instructor") {
      return (
        location.pathname === "/instructor" ||
        location.pathname === "/instructor/new" ||
        location.pathname.startsWith("/instructor/courses/")
      );
    }
    if (path === "/courses" && location.pathname.startsWith("/courses/")) return true;
    if (path === "/my-courses" && location.pathname.startsWith("/my-courses")) return true;
    if (path === "/profile" && location.pathname.startsWith("/profile")) return true;
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent)]/15 text-[var(--accent)] shadow-[var(--shadow-accent)]">
              LMS
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight sm:text-lg">Learning Suite</p>
              <p className="hidden text-xs text-[var(--text-muted)] sm:text-sm md:block">Modern LMS workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] text-[var(--text)] transition hover:bg-[color:var(--surface-strong)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] text-[var(--text)] transition hover:bg-[color:var(--surface-strong)]"
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
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {!isLoggedIn && (
              <nav className="flex items-center gap-2 text-sm">
                {navItems.map((item) => {
                  const isActive = isActivePath(item.to);
                  const showBadge = isInstructorRole && item.to === "/dashboard" && showRequestsBadge;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`rounded-full px-4 py-2 transition ${
                        isActive
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[color:var(--surface)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{item.label}</span>
                        {showBadge && (
                          <>
                            <NotificationDot visible pulseOnce={pulseRequestsDot} />
                            <Badge variant="count" tone="success">{pendingCount > 99 ? "99+" : pendingCount}</Badge>
                          </>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}
            {isLoggedIn && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/login", { replace: true });
                }}
                className="rounded-full px-4 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)] hover:bg-[color:var(--surface)]"
              >
                Logout
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--border)] text-[var(--text)] transition hover:bg-[color:var(--surface)]"
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {isLoggedIn ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 gap-6 px-4 py-6 md:px-6 lg:px-8">
            <aside className="hidden w-64 shrink-0 rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)]/70 p-4 shadow-[var(--shadow-card)] md:block">
              <div className="grid gap-2">
                {navItems.map((item) => {
                  const isActive = isActivePath(item.to);
                  const showBadge = isInstructorRole && item.to === "/dashboard" && showRequestsBadge;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[color:var(--surface-strong)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{item.label}</span>
                        {showBadge && (
                          <>
                            <NotificationDot visible pulseOnce={pulseRequestsDot} />
                            <Badge variant="count" tone="success">{pendingCount > 99 ? "99+" : pendingCount}</Badge>
                          </>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </aside>
            <main className="page-fade scroll-gutter-stable min-h-0 flex-1 overflow-y-auto pb-10 pr-2 md:pr-3">{children}</main>
          </div>
        </div>
      ) : (
        <main className="page-fade scroll-gutter-stable flex-1 overflow-y-auto pr-2 md:pr-3">{children}</main>
      )}

      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={mobileSidebarRef}
          className={`absolute left-0 top-0 h-full w-72 border-r border-[color:var(--border)] bg-[color:var(--surface)]/90 p-4 shadow-[var(--shadow-card)] transition-transform ${
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
              const showBadge = isInstructorRole && item.to === "/dashboard" && showRequestsBadge;
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
                    {showBadge && (
                      <>
                        <NotificationDot visible pulseOnce={pulseRequestsDot} />
                        <Badge variant="count" tone="success">{pendingCount > 99 ? "99+" : pendingCount}</Badge>
                      </>
                    )}
                  </span>
                </Link>
              );
            })}
            {isLoggedIn && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
