import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import { ApiError, apiFetch } from "../lib/api";
import { COUNTRIES } from "../lib/countries";
import CountrySelect from "../components/CountrySelect";
import { useAuth } from "../context/auth";
import GlassCard from "../components/ui/GlassCard";
import { formHelpTextClass, formInputCompactClass, formLabelClass, formLabelTextClass, formTextareaLargeClass } from "../lib/uiClasses";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        className="grid gap-3.5 md:gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSuccess(null);
          setFieldErrors({});
          if (loading) return;
          if (fullName.trim() && fullName.trim().length < 2) {
            setFieldErrors({ fullName: "Full name must be at least 2 characters." });
            return;
          }
          if (phoneMissingCountry) {
            setFieldErrors({ phoneCountry: "Select a country for the phone number." });
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
            if (err instanceof ApiError) {
              setError(err.message);
              setFieldErrors(err.fieldErrors ?? {});
            } else {
              setError(err instanceof Error ? err.message : "Failed to save profile");
            }
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className={formLabelClass}>
          <span className={formLabelTextClass}>Full name</span>
          <input
            className={formInputCompactClass}
            type="text"
            name="fullName"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          {fieldErrors.fullName && <span className={formHelpTextClass + " text-rose-300"}>{fieldErrors.fullName}</span>}
        </label>
        <label className={formLabelClass}>
          <span className={formLabelTextClass}>Phone</span>
          <div className="grid gap-2.5 md:grid-cols-[220px_1fr]">
            <CountrySelect
              value={phoneCountry}
              onChange={setPhoneCountry}
              countries={COUNTRIES}
              placeholder="Select country"
            />
            <input
              className={formInputCompactClass}
              type="tel"
              name="phone"
              inputMode="numeric"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          {fieldErrors.phone && <span className={formHelpTextClass + " text-rose-300"}>{fieldErrors.phone}</span>}
          {fieldErrors.phoneCountry && (
            <span className={formHelpTextClass + " text-rose-300"}>{fieldErrors.phoneCountry}</span>
          )}
          {phoneMissingCountry && (
            <span className={formHelpTextClass + " text-rose-300"}>Select a country for the phone number.</span>
          )}
          {phoneE164 && (
            <span className={formHelpTextClass}>Saved as {phoneE164}</span>
          )}
        </label>
        <label className={formLabelClass}>
          <span className={formLabelTextClass}>Address</span>
          <textarea
            className={formTextareaLargeClass}
            name="address"
            placeholder="Street, City, State"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          {fieldErrors.address && <span className={formHelpTextClass + " text-rose-300"}>{fieldErrors.address}</span>}
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
