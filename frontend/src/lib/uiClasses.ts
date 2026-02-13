export const formLabelClass = "grid gap-1.5 text-sm font-medium text-[var(--ui-text-muted)]";

export const formLabelTextClass = "text-[var(--ui-text-primary)]";

export const formHelpTextClass = "text-xs text-[var(--ui-text-muted)]";

export const formControlBaseClass =
  "w-full rounded-[var(--ui-radius-md)] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-glass-surface)] text-sm text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-muted)] shadow-[var(--ui-shadow-sm)] transition duration-[var(--ui-motion-fast)] focus:border-[var(--ui-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-soft)]";

export const formInputCompactClass = `${formControlBaseClass} h-10 px-3.5`;

export const formInputLargeClass = `${formControlBaseClass} h-11 px-4`;

export const formTextareaLargeClass = `${formControlBaseClass} min-h-[104px] resize-y px-3.5 py-2.5`;

export const formSelectTriggerCompactClass = `${formControlBaseClass} inline-flex h-10 items-center justify-between gap-3 px-3.5`;
