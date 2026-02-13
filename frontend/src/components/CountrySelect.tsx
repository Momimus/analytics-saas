import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryOption } from "../lib/countries";
import { formInputCompactClass, formSelectTriggerCompactClass } from "../lib/uiClasses";

type CountrySelectProps = {
  value: string;
  onChange: (iso2: string) => void;
  countries: CountryOption[];
  placeholder?: string;
};

const MOST_USED = new Set([
  "PK",
  "IN",
  "BD",
  "AE",
  "SA",
  "QA",
  "KW",
  "OM",
  "BH",
  "TR",
  "GB",
  "US",
  "CA",
  "AU",
]);

export default function CountrySelect({ value, onChange, countries, placeholder }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => countries.find((country) => country.iso2 === value), [countries, value]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((country) => {
      return (
        country.label.toLowerCase().includes(term) ||
        country.dial.toLowerCase().includes(term) ||
        country.iso2.toLowerCase().includes(term)
      );
    });
  }, [countries, query]);

  const mostUsed = filtered.filter((country) => MOST_USED.has(country.iso2));
  const rest = filtered.filter((country) => !MOST_USED.has(country.iso2));

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleSelect = (iso2: string) => {
    onChange(iso2);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
          if (event.key === "Enter" && filtered.length > 0) {
            event.preventDefault();
            handleSelect(filtered[0].iso2);
          }
        }}
        className={formSelectTriggerCompactClass}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selected ? "text-[var(--ui-text-primary)]" : "text-[var(--ui-text-muted)]"}>
          {selected ? `${selected.label} (${selected.dial})` : placeholder ?? "Select country"}
        </span>
        <span className="text-[var(--ui-text-muted)]">&#9662;</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-elevated)] shadow-[var(--ui-shadow-md)] backdrop-blur-md">
          <div className="border-b border-[color:var(--ui-border-soft)] p-2.5">
            <input
              className={formInputCompactClass}
              placeholder="Search country or code"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {mostUsed.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ui-text-muted)]">
                  Most used
                </p>
                {mostUsed.map((country) => (
                  <button
                    key={country.iso2}
                    type="button"
                    onClick={() => handleSelect(country.iso2)}
                    className="flex h-9 w-full items-center justify-between rounded-[var(--ui-radius-md)] px-3 text-sm text-[var(--ui-text-primary)] transition hover:bg-[color:var(--ui-glass-surface)]"
                    role="option"
                  >
                    <span>{country.label}</span>
                    <span className="text-[var(--ui-text-muted)]">{country.dial}</span>
                  </button>
                ))}
              </div>
            )}
            <div>
              {rest.map((country) => (
                <button
                  key={country.iso2}
                  type="button"
                  onClick={() => handleSelect(country.iso2)}
                  className="flex h-9 w-full items-center justify-between rounded-[var(--ui-radius-md)] px-3 text-sm text-[var(--ui-text-primary)] transition hover:bg-[color:var(--ui-glass-surface)]"
                  role="option"
                >
                  <span>{country.label}</span>
                  <span className="text-[var(--ui-text-muted)]">{country.dial}</span>
                </button>
              ))}
              {rest.length === 0 && mostUsed.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--ui-text-muted)]">No matches found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
