import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
      <span className="text-[var(--text)]">{label}</span>
      <input
        className={`rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 ${
          className ?? ""
        }`}
        {...props}
      />
    </label>
  );
}