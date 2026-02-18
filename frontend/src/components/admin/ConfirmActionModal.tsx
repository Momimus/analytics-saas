import { useEffect, useState } from "react";
import Button from "../Button";
import Dialog from "../ui/Dialog";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Add a short reason",
  busy = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>

        <label className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
          <span>{reasonLabel}{requireReason ? " *" : ""}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-[96px] w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder={reasonPlaceholder}
            aria-label={reasonLabel}
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-10 px-4 py-0" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="h-10 px-4 py-0"
            disabled={busy || (requireReason && reason.trim().length === 0)}
            onClick={async () => {
              await onConfirm(reason.trim());
            }}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
