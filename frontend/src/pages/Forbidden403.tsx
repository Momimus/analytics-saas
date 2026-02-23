import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";

type Forbidden403Props = {
  currentRole?: "ADMIN" | null;
  requiredRoles?: Array<"ADMIN">;
};

export default function Forbidden403Page({ currentRole, requiredRoles }: Forbidden403Props) {
  const navigate = useNavigate();
  const requiredLabel = requiredRoles && requiredRoles.length > 0 ? requiredRoles.join(", ") : "Unknown";

  return (
    <GlassCard title="Access denied" subtitle="You do not have permission to open this page." className="w-full max-w-2xl">
      <div className="grid gap-4">
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/60 p-3 text-sm text-[var(--text-muted)]">
          <p>
            Current role: <span className="text-[var(--text)]">{currentRole ?? "Unknown"}</span>
          </p>
          <p>
            Required role(s): <span className="text-[var(--text)]">{requiredLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => navigate("/profile")}>
            Go to Profile
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
