import { Link, useLocation } from "react-router-dom";

const ADMIN_SECTIONS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/inbox", label: "Inbox" },
  { to: "/admin/instructors", label: "Instructors" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/courses", label: "Courses" },
  { to: "/admin/enrollments", label: "Enrollments" },
  { to: "/admin/audit-logs", label: "Audit Logs" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(to);
}

export default function AdminSectionNav() {
  const location = useLocation();

  return (
    <nav className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
        {ADMIN_SECTIONS.map((item) => {
          const active = isActive(location.pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--text-muted)] hover:bg-[color:var(--surface-strong)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
