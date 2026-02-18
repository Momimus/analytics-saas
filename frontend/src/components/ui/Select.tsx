import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { formSelectTriggerCompactClass } from "../../lib/uiClasses";

export type SelectItem = {
  label: string;
  value: string;
  disabled?: boolean;
};

type SelectProps = {
  items: SelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minTriggerWidth?: string | false;
  disabled?: boolean;
  ariaLabel?: string;
};

function nextEnabledIndex(items: SelectItem[], start: number, step: 1 | -1) {
  if (items.length === 0) return -1;
  let index = start;
  for (let i = 0; i < items.length; i += 1) {
    index = (index + step + items.length) % items.length;
    if (!items[index]?.disabled) return index;
  }
  return -1;
}

export default function Select({
  items,
  value,
  onChange,
  placeholder = "Select",
  className,
  minTriggerWidth = false,
  disabled = false,
  ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = useMemo(() => items.findIndex((item) => item.value === value), [items, value]);
  const activeLabel = selectedIndex >= 0 ? items[selectedIndex]?.label : placeholder;

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 8;
      const width = rect.width;
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const top = rect.bottom + 8;
      setPosition({ left, top, width });
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target) ?? false;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      if (!clickedTrigger && !clickedMenu) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => nextEnabledIndex(items, prev < 0 ? selectedIndex : prev, 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => nextEnabledIndex(items, prev < 0 ? selectedIndex + 1 : prev, -1));
      }
      if (event.key === "Enter" || event.key === " ") {
        if (activeIndex >= 0) {
          event.preventDefault();
          const next = items[activeIndex];
          if (next && !next.disabled) {
            onChange(next.value);
            setOpen(false);
            triggerRef.current?.focus();
          }
        }
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, items, onChange, open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const startIndex = selectedIndex >= 0 && !items[selectedIndex]?.disabled
      ? selectedIndex
      : nextEnabledIndex(items, -1, 1);
    setActiveIndex(startIndex);
  }, [items, open, selectedIndex]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`${formSelectTriggerCompactClass} min-w-0 max-w-full truncate ${
          minTriggerWidth ? minTriggerWidth : ""
        } hover:bg-[color:var(--ui-glass-elevated)] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="truncate">{activeLabel}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-[var(--ui-text-muted)] transition duration-[var(--ui-motion-fast)] ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="ui-fade-scale fixed z-[9999] max-h-72 overflow-auto rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] p-1 shadow-[var(--ui-shadow-md)] backdrop-blur-md"
            style={{ left: position.left, top: position.top, width: position.width }}
          >
            {items.map((item, index) => {
              const selected = item.value === value;
              return (
                <button
                  key={item.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={item.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    if (item.disabled) return;
                    onChange(item.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`flex w-full items-center justify-between rounded-[var(--ui-radius-md)] px-2.5 py-1.5 text-left text-sm transition duration-[var(--ui-motion-fast)] ${
                    item.disabled
                      ? "cursor-not-allowed text-[var(--ui-text-muted)]/60"
                      : selected
                        ? "bg-[var(--ui-accent-soft)] text-[var(--text)]"
                        : "text-[var(--text)] hover:bg-[color:var(--surface)]/70"
                  } ${index === activeIndex ? "ring-1 ring-[var(--ui-accent-soft)]" : ""}`}
                >
                  <span className="truncate">{item.label}</span>
                  {selected && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--ui-accent)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
