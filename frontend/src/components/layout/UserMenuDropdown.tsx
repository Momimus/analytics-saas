import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserCircle2 } from "lucide-react";
import Badge from "../ui/Badge";
import NotificationDot from "../ui/NotificationDot";

type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

type UserMenuDropdownProps = {
  role: Role;
  userEmail: string | null;
  pendingCount: number;
  showRequestsBadge: boolean;
  pulseRequestsDot: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  onToggleTheme: () => void;
};

type MenuItem = {
  key: string;
  label: string;
  path?: string;
  action?: () => void | Promise<void>;
  showBadge?: boolean;
};

export default function UserMenuDropdown({
  role,
  userEmail,
  pendingCount,
  showRequestsBadge,
  pulseRequestsDot,
  onNavigate,
  onLogout,
  onToggleTheme,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const canSeeRequests = role === "INSTRUCTOR";

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items: MenuItem[] = [
    ...(role === "ADMIN"
      ? [
          { key: "admin", label: "Admin Dashboard", path: "/admin" } satisfies MenuItem,
          { key: "admin-inbox", label: "Inbox", path: "/admin/inbox" } satisfies MenuItem,
          { key: "admin-instructors", label: "Instructors", path: "/admin/instructors" } satisfies MenuItem,
          { key: "admin-users", label: "Users", path: "/admin/users" } satisfies MenuItem,
          { key: "admin-courses", label: "Courses", path: "/admin/courses" } satisfies MenuItem,
          { key: "admin-enrollments", label: "Enrollments", path: "/admin/enrollments" } satisfies MenuItem,
          { key: "admin-audit", label: "Audit Logs", path: "/admin/audit-logs" } satisfies MenuItem,
        ]
      : [
          { key: "dashboard", label: "Dashboard", path: "/dashboard" } satisfies MenuItem,
          { key: "courses", label: "Courses", path: "/courses" } satisfies MenuItem,
        ]),
    ...(canSeeRequests
      ? [{ key: "requests", label: "Requests", path: "/instructor/requests", showBadge: true } satisfies MenuItem]
      : []),
    { key: "profile", label: "Profile", path: "/profile" },
    { key: "theme", label: "Toggle Theme", action: onToggleTheme },
    { key: "logout", label: "Logout", action: onLogout },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open user menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 text-[var(--text)] transition hover:bg-[color:var(--surface-strong)]"
      >
        <UserCircle2 size={19} />
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-12 z-50 w-56 origin-top-right rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-md transition duration-150 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="mb-1 rounded-[var(--radius-sm)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-strong)]/50 px-3 py-2">
          <p className="truncate text-[11px] text-[var(--text-muted)]">{userEmail ?? "Signed-in user"}</p>
          <div className="mt-1">
            <Badge tone={role === "STUDENT" ? "neutral" : "success"} className="px-2 py-0.5 text-[10px]">
              {role}
            </Badge>
          </div>
        </div>

        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={async () => {
              setOpen(false);
              if (item.path) {
                onNavigate(item.path);
                return;
              }
              if (item.action) {
                await item.action();
              }
            }}
            className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[color:var(--surface-strong)] hover:text-[var(--text)]"
          >
            <span>{item.label}</span>
            {item.showBadge && showRequestsBadge ? (
              <span className="inline-flex items-center gap-1.5">
                <NotificationDot visible pulseOnce={pulseRequestsDot} />
                <Badge variant="count" tone="success">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Badge>
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
