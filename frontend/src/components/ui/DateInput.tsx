import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { formSelectTriggerCompactClass } from "../../lib/uiClasses";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function parseDateValue(value: string) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function DateInput({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  ariaLabel,
}: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState<Date>(selectedDate ?? new Date());
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setViewDate(selectedDate ?? new Date());
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 8;
      const width = Math.max(rect.width, 280);
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const top = rect.bottom + 8;
      setPosition({ left, top, width });
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target) ?? false;
      const clickedPanel = panelRef.current?.contains(target) ?? false;
      if (!clickedTrigger && !clickedPanel) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
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
  }, [open]);

  const grid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    const start = new Date(year, month, 1 - firstWeekday);
    return Array.from({ length: 42 }).map((_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return {
        date: day,
        inMonth: day.getMonth() === month,
      };
    });
  }, [viewDate]);

  const displayValue = formatDisplay(value);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`${formSelectTriggerCompactClass} min-w-32 hover:bg-[color:var(--ui-glass-elevated)] disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${displayValue ? "text-[var(--text)]" : "text-[var(--ui-text-muted)]"}`}>
          {displayValue || placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--ui-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M8 2v4M16 2v4M3 10h18" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
        </svg>
      </button>

      {open && position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Select date"
            className="ui-fade-scale fixed z-[9999] rounded-[var(--ui-radius-xl)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] p-2.5 shadow-[var(--ui-shadow-md)] backdrop-blur-md"
            style={{ left: position.left, top: position.top, width: position.width }}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)]/70 px-2 py-1 text-xs text-[var(--text)] hover:bg-[color:var(--surface)]"
                onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                Prev
              </button>
              <p className="text-sm font-medium text-[var(--text)]">
                {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </p>
              <button
                type="button"
                className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)]/70 px-2 py-1 text-xs text-[var(--text)] hover:bg-[color:var(--surface)]"
                onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                Next
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[var(--ui-text-muted)]">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">{label}</div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grid.map(({ date, inMonth }) => {
                const ymd = formatYmd(date);
                const isSelected = value === ymd;
                const isToday = formatYmd(date) === formatYmd(new Date());
                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => {
                      onChange(ymd);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={`h-8 rounded-[var(--ui-radius-md)] text-xs transition ${
                      isSelected
                        ? "bg-[var(--ui-accent-soft)] text-[var(--text)] ring-1 ring-[var(--ui-accent)]"
                        : inMonth
                          ? "text-[var(--text)] hover:bg-[color:var(--surface)]/70"
                          : "text-[var(--ui-text-muted)]/60 hover:bg-[color:var(--surface)]/40"
                    } ${isToday ? "border border-[var(--ui-accent-soft)]" : ""}`}
                    aria-label={date.toDateString()}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)]/70 px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[color:var(--surface)]"
                onClick={() => onChange("")}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)]/70 px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[color:var(--surface)]"
                onClick={() => {
                  const today = formatYmd(new Date());
                  onChange(today);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
