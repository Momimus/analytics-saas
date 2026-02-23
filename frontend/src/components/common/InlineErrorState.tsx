import Button from "../Button";

type InlineErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  details?: string;
  statusCode?: number;
};

function friendlyTitle(statusCode?: number) {
  if (statusCode === 401) return "Session required";
  if (statusCode === 403) return "Action not allowed";
  if (statusCode === 404) return "Resource not found";
  if (statusCode === 429) return "Too many requests";
  if (statusCode && statusCode >= 500) return "Server issue";
  return "Unable to load data";
}

function friendlyMessage(message: string, statusCode?: number) {
  if (statusCode === 401) return "Please sign in again and retry.";
  if (statusCode === 403) return "You do not have permission for this action.";
  if (statusCode === 404) return "The requested item could not be found.";
  if (statusCode === 429) return "Rate limit reached. Wait a moment and retry.";
  if (statusCode && statusCode >= 500) return "The server returned an error. Please retry.";
  return message || "Something went wrong while loading data.";
}

export default function InlineErrorState({ title, message, onRetry, details, statusCode }: InlineErrorStateProps) {
  const resolvedTitle = title ?? friendlyTitle(statusCode);
  const resolvedMessage = friendlyMessage(message, statusCode);

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_8%,white_92%)] p-4">
      <p className="text-sm font-semibold text-[var(--danger)]">{resolvedTitle}</p>
      <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--danger)_82%,var(--text)_18%)]">{resolvedMessage}</p>
      {statusCode ? <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--danger)_75%,var(--text-muted)_25%)]">Status: {statusCode}</p> : null}
      {details ? <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--danger)_75%,var(--text-muted)_25%)]">{details}</p> : null}
      {onRetry ? (
        <div className="mt-3">
          <Button type="button" variant="ghost" className="h-10 px-3 py-0" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
