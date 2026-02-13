import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import GlassCard from "../components/ui/GlassCard";
import { apiFetch } from "../lib/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  return (
    <div className="flex min-h-[calc(100svh-64px)] w-full items-center justify-center px-4 py-6">
      <GlassCard title="Forgot password" subtitle="We will send you a reset link." className="w-full max-w-md p-5 sm:p-6">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setSuccess(null);
            setResetLink(null);
            if (!email.trim() || loading) return;
            setLoading(true);
            try {
              const result = await apiFetch<{ ok: boolean; resetLink?: string }>("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email: email.trim() }),
              });
              if (result.resetLink) {
                setResetLink(result.resetLink);
              }
              setSuccess("If the email exists, a reset link has been generated.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to request reset");
            } finally {
              setLoading(false);
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
          {error && <p className="text-sm text-rose-300 break-words">{error}</p>}
          {success && <p className="text-sm text-emerald-300 break-words">{success}</p>}
          {resetLink && (
            <a className="text-sm text-[var(--accent)] hover:underline break-words" href={resetLink}>
              {resetLink}
            </a>
          )}
          <div className="pt-1">
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => navigate("/login")} fullWidth>
            Back to login
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
