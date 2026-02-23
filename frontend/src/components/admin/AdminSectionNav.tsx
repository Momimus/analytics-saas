import { Link, useLocation } from "react-router-dom";

const ADMIN_SECTIONS = [
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/events", label: "Events" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/settings", label: "Settings" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/admin/analytics") {
    return pathname === "/admin" || pathname === "/admin/analytics";
  }
  return pathname.startsWith(to);
}

export default function AdminSectionNav() {
  const location = useLocation();

  return (
    <nav className="hidden overflow-x-auto sm:block">
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
