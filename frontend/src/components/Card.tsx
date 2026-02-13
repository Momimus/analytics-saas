import type { PropsWithChildren } from "react";
import GlassCard from "./ui/GlassCard";

type CardProps = PropsWithChildren<{ className?: string; title?: string; subtitle?: string }>;

// Deprecated. Use components/ui/GlassCard directly.
export default function Card({ className, title, subtitle, children }: CardProps) {
  return (
    <GlassCard className={className} title={title} subtitle={subtitle}>
      {children}
    </GlassCard>
  );
}
