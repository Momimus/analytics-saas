import type { MouseEvent } from "react";

type ActionItem = {
  label: string;
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
};

type MobileActionMenuProps = {
  label?: string;
  items: ActionItem[];
};

export default function MobileActionMenu({ label = "Actions", items }: MobileActionMenuProps) {
  const handleSelect = async (event: MouseEvent<HTMLButtonElement>, onSelect: ActionItem["onSelect"]) => {
    await onSelect();
    const details = event.currentTarget.closest("details");
    if (details) details.removeAttribute("open");
  };

  return (
    <details className="relative sm:hidden">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 text-xs text-[var(--text-muted)] transition hover:bg-[color:var(--surface-strong)] hover:text-[var(--text)]">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-1 grid min-w-40 gap-1 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] p-1.5 shadow-[var(--shadow-card)]">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={(event) => {
              void handleSelect(event, item.onSelect);
            }}
            className="h-8 rounded-[var(--radius-sm)] px-2.5 text-left text-xs text-[var(--text)] transition hover:bg-[color:var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
