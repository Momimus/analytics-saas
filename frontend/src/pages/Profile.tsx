import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import { apiFetch } from "../lib/api";
import { COUNTRIES } from "../lib/countries";
import CountrySelect from "../components/CountrySelect";
import { useAuth } from "../context/auth";
import GlassCard from "../components/ui/GlassCard";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setPhone(user.phone ?? "");
    setPhoneCountry(user.phoneCountry ?? "");
    setPhoneE164(user.phoneE164 ?? "");
    setAddress(user.address ?? "");
  }, [user]);

  const phoneMissingCountry = useMemo(
    () => phone.trim().length > 0 && phoneCountry.trim().length === 0,
    [phone, phoneCountry]
  );

  return (
    <GlassCard title="Profile" subtitle="Update your contact information." className="w-full">
      <form
        className="grid gap-4 md:gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSuccess(null);
          if (loading) return;
          if (phoneMissingCountry) {
            setError("Select a country for the phone number.");
            return;
          }
          setLoading(true);
          try {
            const result = await apiFetch<{ user: NonNullable<typeof user> }>("/me", {
              method: "PATCH",
              body: JSON.stringify({
                fullName,
                phone,
                phoneCountry,
                address,
              }),
            });
            if (result.user) {
              setUser(result.user);
              setPhoneE164(result.user.phoneE164 ?? "");
            }
            setSuccess("Profile saved.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save profile");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
          <span className="text-[var(--text)]">Full name</span>
          <input
            className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            type="text"
            name="fullName"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
          <span className="text-[var(--text)]">Phone</span>
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <CountrySelect
              value={phoneCountry}
              onChange={setPhoneCountry}
              countries={COUNTRIES}
              placeholder="Select country"
            />
            <input
              className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              type="tel"
              name="phone"
              inputMode="numeric"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          {phoneMissingCountry && (
            <span className="text-xs text-rose-300">Select a country for the phone number.</span>
          )}
          {phoneE164 && (
            <span className="text-xs text-[var(--text-muted)]">Saved as {phoneE164}</span>
          )}
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
          <span className="text-[var(--text)]">Address</span>
          <textarea
            className="min-h-[120px] w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            name="address"
            placeholder="Street, City, State"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}
        <div className="pt-1">
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
