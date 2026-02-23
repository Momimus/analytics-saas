import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = searchParams.get("reset");

  return (
    <div className="fixed inset-0 overflow-y-auto px-4 py-6 pointer-events-none">
      <div className="flex min-h-full w-full items-center justify-center">
      <GlassCard
        title="Welcome back"
        subtitle="Use your account credentials to sign in."
        className="pointer-events-auto w-full max-w-md p-5 sm:p-6"
      >
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            if (loading) return;
            setLoading(true);
            try {
              await apiFetch<{ user: { id: string; email: string; role: "ADMIN" } }>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              await login();
              navigate("/admin/analytics", { replace: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            } finally {
              setLoading(false);
              setShowPassword(false);
              setPassword("");
            }
          }}
        >
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">Password</span>
            <div className="relative">
              <input
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ fontFamily: "inherit" }}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                spellCheck={false}
                value={password}
                onChange={(event) => {
                  const next = event.target.value.replace(/[\u0000-\u001F\u007F]/g, "");
                  setPassword(next);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 5l20 14" />
                    <path d="M10.5 6.5A9.5 9.5 0 0 1 21 12s-3.5 6-9 6a8.7 8.7 0 0 1-4.5-1.2" />
                    <path d="M6.2 8.1A9.7 9.7 0 0 0 3 12s3.5 6 9 6" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {reset && <p className="text-sm text-[var(--success)]">Password updated. Please sign in.</p>}
          {error && <p className="break-words text-sm text-[var(--danger)]">{error}</p>}
          <div className="pt-1">
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <div className="mt-4 grid gap-2 text-center text-sm text-[var(--text-muted)]">
          <Link className="text-[var(--accent)] hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </GlassCard>
      </div>
    </div>
  );
}
