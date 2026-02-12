import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { apiFetch } from "../lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    role: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const validate = () => {
    const nextErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
      role?: string;
    } = {};
    const normalizedEmail = email.trim();
    const role = "STUDENT";

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!role) {
      nextErrors.role = "Role is required.";
    }

    return nextErrors;
  };

  const focusFirstError = (errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
  }) => {
    const order: Array<"email" | "password" | "confirmPassword" | "role"> = [
      "email",
      "password",
      "confirmPassword",
      "role",
    ];
    const firstField = order.find((field) => errors[field]);
    if (!firstField) return;
    const target = formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto px-4 py-6 pointer-events-none">
      <div className="flex min-h-full w-full items-center justify-center">
      <Card title="Create account" subtitle="Set up your LMS profile in seconds." className="pointer-events-auto w-full max-w-md p-5 sm:p-6">
        <form
          ref={formRef}
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitted(true);
            setApiError(null);
            setSuccess(null);
            if (loading) return;

            const nextErrors = validate();
            setFieldErrors(nextErrors);
            setTouched({
              email: true,
              password: true,
              confirmPassword: true,
              role: true,
            });
            if (Object.keys(nextErrors).length > 0) {
              focusFirstError(nextErrors);
              return;
            }

            setLoading(true);
            try {
              await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              setSuccess("Account created successfully.");
              redirectTimerRef.current = window.setTimeout(() => {
                navigate("/login?registered=1", { replace: true });
              }, 700);
            } catch (err) {
              setApiError(err instanceof Error ? err.message : "Registration failed");
            } finally {
              setLoading(false);
              setPassword("");
              setConfirmPassword("");
              setShowPassword(false);
              setShowConfirm(false);
            }
          }}
        >
          <div className="relative">
            <Input
              type="email"
              name="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              className={
                (submitted || touched.email) && fieldErrors.email
                  ? "border-red-400/70 focus:border-red-400/70 focus:ring-red-400/20"
                  : undefined
              }
            />
            {(submitted || touched.email) && fieldErrors.email && (
              <span className="pointer-events-none absolute left-0 top-full mt-1 text-[11px] leading-4 text-red-400/70">
                {fieldErrors.email}
              </span>
            )}
          </div>
          <div className="relative">
          <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">Password</span>
            <div className="relative">
              <input
                className={`w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                  (submitted || touched.password) && fieldErrors.password
                    ? "border-red-400/70 focus:border-red-400/70 focus:ring-red-400/20"
                    : "focus:border-[var(--accent)] focus:ring-[var(--accent)]/30"
                }`}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
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
          {(submitted || touched.password) && fieldErrors.password && (
            <span className="pointer-events-none absolute left-0 top-full mt-1 text-[11px] leading-4 text-red-400/70">
              {fieldErrors.password}
            </span>
          )}
          </div>
          <div className="relative">
          <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">Confirm password</span>
            <div className="relative">
              <input
                className={`w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 pr-12 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 ${
                  (submitted || touched.confirmPassword) && fieldErrors.confirmPassword
                    ? "border-red-400/70 focus:border-red-400/70 focus:ring-red-400/20"
                    : "focus:border-[var(--accent)] focus:ring-[var(--accent)]/30"
                }`}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                {showConfirm ? (
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
          {(submitted || touched.confirmPassword) && fieldErrors.confirmPassword && (
            <span className="pointer-events-none absolute left-0 top-full mt-1 text-[11px] leading-4 text-red-400/70">
              {fieldErrors.confirmPassword}
            </span>
          )}
          </div>
          <div className="relative">
          <div className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
            <span className="text-[var(--text)]">Role</span>
            <div
              className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)]"
              role="status"
              aria-label="Role"
            >
              Student
            </div>
          </div>
          {(submitted || touched.role) && fieldErrors.role && (
            <span className="pointer-events-none absolute left-0 top-full mt-1 text-[11px] leading-4 text-red-400/70">
              {fieldErrors.role}
            </span>
          )}
          </div>
          {apiError && <p className="text-sm text-rose-300 break-words">{apiError}</p>}
          {success && <p className="text-sm text-emerald-300 break-words">{success}</p>}
          <div className="pt-1">
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm text-[var(--text-muted)]">
          <Link className="text-[var(--accent)] hover:underline" to="/login">
            Already have an account? Sign in
          </Link>
        </div>
      </Card>
      </div>
    </div>
  );
}
