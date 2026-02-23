import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import GlassCard from "../components/ui/GlassCard";
import { apiFetch } from "../lib/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token") ?? "";
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isValid = useMemo(
    () => token.length > 0 && password.length >= 6 && password === confirmPassword,
    [token, password, confirmPassword]
  );

  return (
    <div className="flex min-h-[calc(100svh-64px)] w-full items-center justify-center px-4 py-6">
      <GlassCard title="Reset password" subtitle="Set a new password for your account." className="w-full max-w-md p-5 sm:p-6">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            if (!isValid || loading) return;
            setLoading(true);
            try {
              await apiFetch("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, newPassword: password }),
              });
              navigate("/login?reset=1", { replace: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to reset password");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">New password</span>
            <input
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              type="password"
              name="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {passwordTooShort && <span className="text-xs text-[var(--danger)]">Minimum 6 characters.</span>}
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">Confirm password</span>
            <input
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {passwordsMismatch && <span className="text-xs text-[var(--danger)]">Passwords do not match.</span>}
          </label>
          {error && <p className="break-words text-sm text-[var(--danger)]">{error}</p>}
          <div className="pt-1">
            <Button type="submit" fullWidth disabled={!isValid || loading}>
              {loading ? "Saving..." : "Reset password"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
