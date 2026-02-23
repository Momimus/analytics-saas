import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserCircle2 } from "lucide-react";
import Badge from "../ui/Badge";

type Role = "ADMIN";

type UserMenuDropdownProps = {
  role: Role;
  userEmail: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
};

type MenuItem = {
  key: string;
  label: string;
  path?: string;
  action?: () => void | Promise<void>;
};

export default function UserMenuDropdown({
  role,
  userEmail,
  onNavigate,
  onLogout,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
          { key: "profile", label: "Profile", path: "/profile" } satisfies MenuItem,
        ]
      : []),
    { key: "logout", label: "Logout", action: onLogout },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open user menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-2.5 text-[var(--text)] shadow-[var(--ui-shadow-sm)] transition hover:bg-[color:var(--surface-alt)]"
      >
        <UserCircle2 size={19} />
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-12 z-50 w-60 origin-top-right rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)]/98 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-md transition duration-150 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="mb-1 rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-muted)]">Account</p>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{userEmail ?? "Signed-in user"}</p>
          <div className="mt-1">
            <Badge tone="success" className="px-2 py-0.5 text-[10px]">
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
            className="flex w-full items-center justify-between rounded-[var(--ui-radius-md)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[color:var(--surface-alt)] hover:text-[var(--text)]"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
