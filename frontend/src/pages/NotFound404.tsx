import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";

export default function NotFound404Page() {
  const navigate = useNavigate();

  return (
    <GlassCard title="Page not found" subtitle="The page you are looking for does not exist or has moved." className="w-full max-w-2xl">
      <div className="grid gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          Check the URL, go back to the previous screen, or continue from a known section.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => navigate("/profile")}>
            Go to Profile
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/analytics")}>
            Analytics
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
