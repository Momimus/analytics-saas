type ToastBannerProps = {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
};

export default function ToastBanner({ message, tone = "success", onClose }: ToastBannerProps) {
  const color = tone === "success" ? "text-emerald-300" : "text-rose-300";

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/95 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm ${color}`}>{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
