import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  const variants = {
    primary:
      "border-[color:color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-accent)] hover:bg-[color:color-mix(in_srgb,var(--accent)_88%,white_12%)]",
    ghost:
      "border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[var(--text)] hover:bg-[color:var(--surface)]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...props}
    />
  );
}
