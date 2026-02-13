import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type Item = {
  label: string;
  value: string;
};

type SelectPopoverProps = {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SelectPopover({ items, value, onChange, className }: SelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeLabel = items.find((item) => item.value === value)?.label ?? "Select";

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 8;
      const width = rect.width;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - width
      );
      const top = rect.bottom + 8;
      setPosition({ left, top, width });
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target) ?? false;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-44 items-center justify-between gap-3 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-surface)] px-4 py-2 text-sm text-[var(--text)] shadow-[var(--ui-shadow-sm)] transition duration-[var(--ui-motion-fast)] hover:bg-[color:var(--surface)]/70"
      >
        <span>{activeLabel}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-[var(--ui-text-muted)] transition duration-[var(--ui-motion-fast)] ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="ui-fade-scale fixed z-[9999] overflow-hidden rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] p-1 shadow-[var(--ui-shadow-md)] backdrop-blur-md"
            style={{ left: position.left, top: position.top, width: position.width }}
          >
            {items.map((item) => {
              const selected = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[var(--ui-radius-md)] px-3 py-2 text-left text-sm transition duration-[var(--ui-motion-fast)] ${
                    selected
                      ? "bg-[var(--ui-accent-soft)] text-[var(--text)]"
                      : "text-[var(--text)] hover:bg-[color:var(--surface)]/70"
                  }`}
                >
                  <span>{item.label}</span>
                  {selected && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--ui-accent)]" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
