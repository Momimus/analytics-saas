import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export default function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
      <span className="text-[var(--text)]">{label}</span>
      <select
        className={`rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 ${
          className ?? ""
        }`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}