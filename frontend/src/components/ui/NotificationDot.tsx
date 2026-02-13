type NotificationDotProps = {
  visible?: boolean;
  pulseOnce?: boolean;
  className?: string;
};

export default function NotificationDot({ visible = false, pulseOnce = false, className }: NotificationDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ui-dot-bg)] shadow-[0_0_0_3px_var(--ui-dot-ring)] transition-[transform,opacity,box-shadow] duration-[var(--ui-motion-fast)] ease-out ${visible ? "scale-100 opacity-100" : "scale-90 opacity-0"} ${pulseOnce && visible ? "ui-dot-pulse-once" : ""} ${className ?? ""}`}
    />
  );
}
