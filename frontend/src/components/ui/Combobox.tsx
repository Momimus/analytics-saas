import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type ComboboxOption = {
  value: string;
  label: string;
  subLabel?: string;
  disabled?: boolean;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  error?: string | null;
  className?: string;
  panelClassName?: string;
  optionTitle?: (option: ComboboxOption) => string;
  ariaLabel?: string;
};

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  searchable = false,
  searchValue = "",
  onSearchValueChange,
  searchPlaceholder = "Search...",
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "No options found",
  error = null,
  className,
  panelClassName,
  optionTitle,
  ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerClassName =
    "flex h-10 w-full appearance-none items-center justify-between rounded-[var(--ui-radius-lg)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 py-2 text-left text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] transition duration-[var(--ui-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60";

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`${triggerClassName} ${className ?? ""}`}
      >
        <span
          className={`truncate text-sm ${
            selectedOption ? "text-[var(--ui-text-primary)]" : "text-[var(--ui-text-muted)]"
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--ui-text-muted)]" />
      </button>

      {open ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-30 w-full rounded-[var(--ui-radius-lg)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] p-2 shadow-[var(--ui-shadow-md)] ${panelClassName ?? ""}`}
        >
          {searchable ? (
            <input
              value={searchValue}
              onChange={(event) => onSearchValueChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface)] px-3 text-sm text-[var(--ui-text-primary)] shadow-[var(--ui-shadow-sm)] outline-none transition focus:border-[var(--ui-accent)] focus:ring-2 focus:ring-[var(--ui-accent-soft)]"
              autoComplete="off"
            />
          ) : null}

          <div
            className={`rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--surface-alt)] p-1 ${
              searchable ? "mt-2" : ""
            } max-h-56 overflow-auto`}
          >
            {loading ? (
              <p className="px-2 py-2 text-sm text-[var(--ui-text-muted)]">{loadingMessage}</p>
            ) : error ? (
              <p className="px-2 py-2 text-sm text-[var(--danger)]">{error}</p>
            ) : options.length === 0 ? (
              <p className="px-2 py-2 text-sm text-[var(--ui-text-muted)]">{emptyMessage}</p>
            ) : (
              options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={optionTitle?.(option)}
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-[var(--ui-radius-sm)] px-2 py-1.5 text-left text-sm transition ${
                      option.disabled
                        ? "cursor-not-allowed opacity-60"
                        : selected
                          ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"
                          : "text-[var(--ui-text-primary)] hover:bg-[color:var(--surface)]"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="ml-3 inline-flex min-w-[3.5rem] items-center justify-end gap-1 font-mono text-xs text-[var(--ui-text-muted)]">
                      {option.subLabel ? <span className="truncate">{option.subLabel}</span> : null}
                      <Check
                        className={`h-3.5 w-3.5 text-[var(--ui-accent)] ${selected ? "opacity-100" : "opacity-0"}`}
                      />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
