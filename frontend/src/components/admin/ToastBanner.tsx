type ToastBannerProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onClose: () => void;
};

export default function ToastBanner({ message, tone = "success", onClose }: ToastBannerProps) {
  const accentClass = tone === "success"
    ? "text-emerald-200 border-emerald-400/35 bg-emerald-500/10"
    : tone === "error"
      ? "text-rose-200 border-rose-400/35 bg-rose-500/10"
      : "text-sky-200 border-sky-400/35 bg-sky-500/10";

  return (
    <div className="ui-fade-scale fixed bottom-4 right-4 z-50 max-w-sm rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/95 p-3 shadow-[var(--shadow-card)] backdrop-blur-md transition-opacity duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex items-start gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2 ${accentClass}`}>
          {tone === "success" ? (
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="m5 13 4 4L19 7" />
            </svg>
          ) : tone === "error" ? (
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M12 8h.01M11 12h2v4h-2z" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
          <p className="text-sm">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="rounded-[var(--radius-sm)] px-1.5 py-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[color:var(--surface-strong)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
