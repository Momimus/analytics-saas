import type { PropsWithChildren, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cog, LayoutDashboard, Package, Search, ShoppingCart, Users } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import AppHeader from "./layout/AppHeader";
import Select from "./ui/Select";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
};

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "ADMIN";
  const isAnalyticsRoute = location.pathname.startsWith("/admin/analytics");

  const navItems = useMemo<NavItem[]>(() => {
    if (isAdmin) {
      return [
        { to: "/admin/analytics", label: "Analytics", icon: <LayoutDashboard className="h-4 w-4" /> },
        { to: "/admin/products", label: "Products", icon: <Package className="h-4 w-4" /> },
        { to: "/admin/orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
        { to: "/admin/events", label: "Events", icon: <Activity className="h-4 w-4" /> },
        { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { to: "/admin/settings", label: "Settings", icon: <Cog className="h-4 w-4" /> },
      ];
    }

    return [{ to: "/login", label: "Login", icon: <LayoutDashboard className="h-4 w-4" /> }];
  }, [isAdmin]);

  const isActivePath = useCallback((path: string) => {
    if (path === "/admin/analytics") {
      return location.pathname === "/admin" || location.pathname.startsWith("/admin/analytics");
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/admin/analytics")) return "Analytics";
    if (location.pathname.startsWith("/admin/products")) return "Products";
    if (location.pathname.startsWith("/admin/orders")) return "Orders";
    if (location.pathname.startsWith("/admin/events")) return "Events";
    if (location.pathname.startsWith("/admin/users")) return "Users";
    if (location.pathname.startsWith("/admin/settings")) return "Settings";
    if (location.pathname.startsWith("/admin")) return "Admin";
    if (location.pathname.startsWith("/profile")) return "Profile";
    if (location.pathname.startsWith("/forgot-password")) return "Forgot Password";
    if (location.pathname.startsWith("/reset-password")) return "Reset Password";
    return "Workspace";
  }, [location.pathname]);

  const analyticsSearch = searchParams.get("q") ?? "";
  const analyticsRange = searchParams.get("range") ?? "7d";

  const updateAnalyticsParam = useCallback((key: "q" | "range", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const analyticsHeaderControls = isLoggedIn && isAnalyticsRoute ? (
    <div className="flex items-center gap-2.5">
      <label className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ui-text-muted)]" />
        <input
          value={analyticsSearch}
          onChange={(event) => updateAnalyticsParam("q", event.target.value)}
          placeholder="Search activity"
          className="h-10 w-60 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-9 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
        />
      </label>
      <div className="w-40">
        <Select
          value={analyticsRange}
          onChange={(value) => updateAnalyticsParam("range", value)}
          ariaLabel="Analytics date range"
          items={[
            { label: "Last 7 days", value: "7d" },
            { label: "Last 30 days", value: "30d" },
            { label: "Last 90 days", value: "90d" },
          ]}
        />
      </div>
    </div>
  ) : null;

  const desktopSidebar = isLoggedIn && isAdmin ? (
    <aside className="hidden h-screen lg:sticky lg:top-0 lg:flex lg:w-[var(--layout-sidebar-width)] lg:flex-col lg:border-r lg:border-[color:var(--ui-border-soft)] lg:bg-[color:var(--ui-sidebar-bg)] lg:px-4 lg:py-4 lg:backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3 rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3.5 py-3 shadow-[var(--ui-shadow-panel)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
          AS
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-[var(--ui-text-primary)]">Analytics SaaS</p>
          <p className="text-xs text-[var(--ui-text-muted)]">Admin Console</p>
        </div>
      </div>

      <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">
        Workspace
      </div>
      <nav className="grid gap-1">
        {navItems.map((item) => {
          const isActive = isActivePath(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative inline-flex items-center gap-3 rounded-[var(--ui-radius-md)] border px-3.5 py-2.5 text-sm transition ${
                isActive
                  ? "border-[color:color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color:var(--ui-accent-soft)] text-[var(--accent)] shadow-[var(--ui-shadow-sm)]"
                  : "border-transparent text-[var(--ui-text-muted)] hover:border-[color:var(--ui-border-soft)] hover:bg-[color:var(--surface)] hover:text-[var(--ui-text-primary)]"
              }`}
            >
              {isActive ? <span aria-hidden className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[var(--accent)]/75" /> : null}
              <span className="text-current">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 py-2.5 text-xs text-[var(--ui-text-muted)]">
        Signed in as
        <div className="mt-1 truncate text-sm font-medium text-[var(--ui-text-primary)]">{user?.email}</div>
      </div>
    </aside>
  ) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {desktopSidebar}

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            isLoggedIn={isLoggedIn}
            role={user?.role ?? null}
            userEmail={user?.email ?? null}
            pageTitle={pageTitle}
            navItems={[]}
            headerControls={analyticsHeaderControls}
            onNavigate={(path) => navigate(path)}
            onToggleMobileMenu={() => setIsSidebarOpen((prev) => !prev)}
            onLogout={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          />

          <main className="page-fade scroll-gutter-stable flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/18 backdrop-blur-sm transition-opacity lg:hidden ${
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={mobileSidebarRef}
          className={`absolute left-0 top-16 h-[calc(100dvh-4rem)] w-72 border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-sidebar-bg)] px-4 py-4 shadow-[var(--shadow-card)] backdrop-blur-xl transition-transform ${
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

          <div className="grid gap-1.5">
            {navItems.map((item) => {
              const isActive = isActivePath(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`inline-flex items-center gap-3 rounded-[var(--ui-radius-md)] border px-4 py-2.5 text-sm transition ${
                    isActive
                      ? "border-[color:color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color:var(--ui-accent-soft)] text-[var(--accent)]"
                      : "border-[color:var(--ui-border-soft)] text-[var(--text-muted)] hover:bg-[color:var(--surface-alt)] hover:text-[var(--text)]"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    setIsSidebarOpen(false);
                    navigate("/login", { replace: true });
                  }}
                  className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] px-4 py-2.5 text-left text-sm font-medium text-[var(--text-muted)] transition hover:bg-[color:var(--surface)] hover:text-[var(--text)]"
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
