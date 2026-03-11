import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 overflow-y-auto px-4 py-6 pointer-events-none">
      <div className="flex min-h-full w-full items-center justify-center">
        <GlassCard
          title="Create your workspace"
          subtitle="Sign up to create a dedicated analytics workspace."
          className="pointer-events-auto w-full max-w-md p-5 sm:p-6"
        >
          <form
            className="grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (loading) return;
              setLoading(true);
              setError(null);
              try {
                await apiFetch<{ user: { id: string } }>("/auth/register", {
                  method: "POST",
                  body: JSON.stringify({
                    email,
                    password,
                    fullName,
                    workspaceName,
                  }),
                });
                await login();
                navigate("/admin/analytics", { replace: true });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to register");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Input
              name="fullName"
              label="Full name"
              placeholder="Jane Founder"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <Input
              name="workspaceName"
              label="Workspace name"
              placeholder="Acme Analytics"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              type="password"
              name="password"
              label="Password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Creating workspace..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
