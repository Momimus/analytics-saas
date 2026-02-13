import { getCountries, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

type ValidationResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors: Record<string, string>;
    };

type ProfileUpdateInput = {
  fullName?: unknown;
  phone?: unknown;
  phoneCountry?: unknown;
  address?: unknown;
};

export type ProfileUpdateData = {
  fullName?: string | null;
  phone?: string | null;
  phoneCountry?: string | null;
  phoneE164?: string | null;
  address?: string | null;
};

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;
const ALPHA_REGEX = /[A-Za-z]/;
const ALLOWED_COUNTRY_CODES = new Set(getCountries());

function expectOptionalString(value: unknown, field: string): ValidationResult<string | undefined> {
  if (value === undefined) return { ok: true, data: undefined };
  if (typeof value !== "string") {
    return {
      ok: false,
      message: "Validation failed",
      fieldErrors: { [field]: "Must be a string" },
    };
  }
  return { ok: true, data: value };
}

export function validateProfileUpdatePayload(input: ProfileUpdateInput): ValidationResult<ProfileUpdateData> {
  const fieldErrors: Record<string, string> = {};
  const data: ProfileUpdateData = {};

  const fullNameResult = expectOptionalString(input.fullName, "fullName");
  const phoneResult = expectOptionalString(input.phone, "phone");
  const phoneCountryResult = expectOptionalString(input.phoneCountry, "phoneCountry");
  const addressResult = expectOptionalString(input.address, "address");

  for (const result of [fullNameResult, phoneResult, phoneCountryResult, addressResult]) {
    if (!result.ok) {
      Object.assign(fieldErrors, result.fieldErrors);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Validation failed", fieldErrors };
  }

  const fullName = fullNameResult.ok ? fullNameResult.data : undefined;
  if (fullName !== undefined) {
    const trimmed = fullName.trim();
    if (trimmed.length === 0) {
      data.fullName = null;
    } else if (CONTROL_CHAR_REGEX.test(trimmed)) {
      fieldErrors.fullName = "Full name contains invalid characters";
    } else if (trimmed.length < 2) {
      fieldErrors.fullName = "Full name must be at least 2 characters";
    } else if (trimmed.length > 80) {
      fieldErrors.fullName = "Full name must be at most 80 characters";
    } else {
      data.fullName = trimmed;
    }
  }

  const address = addressResult.ok ? addressResult.data : undefined;
  if (address !== undefined) {
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      data.address = null;
    } else if (CONTROL_CHAR_REGEX.test(trimmed)) {
      fieldErrors.address = "Address contains invalid characters";
    } else if (trimmed.length > 300) {
      fieldErrors.address = "Address must be at most 300 characters";
    } else {
      data.address = trimmed;
    }
  }

  const phoneRaw = phoneResult.ok ? phoneResult.data : undefined;
  const countryRaw = phoneCountryResult.ok ? phoneCountryResult.data : undefined;

  if (phoneRaw !== undefined) {
    const trimmedPhone = phoneRaw.trim();
    const hasPhone = trimmedPhone.length > 0;

    if (!hasPhone) {
      data.phone = null;
      data.phoneCountry = null;
      data.phoneE164 = null;
    } else {
      if (ALPHA_REGEX.test(trimmedPhone)) {
        fieldErrors.phone = "Phone number cannot contain letters";
      }
      if (CONTROL_CHAR_REGEX.test(trimmedPhone)) {
        fieldErrors.phone = "Phone number contains invalid characters";
      }

      const normalizedCountry = typeof countryRaw === "string" ? countryRaw.trim().toUpperCase() : "";
      if (!normalizedCountry) {
        fieldErrors.phoneCountry = "Phone country is required when phone is provided";
      } else if (!ALLOWED_COUNTRY_CODES.has(normalizedCountry as CountryCode)) {
        fieldErrors.phoneCountry = "Phone country must be a valid ISO code";
      }

      if (!fieldErrors.phone && !fieldErrors.phoneCountry) {
        const parsed = parsePhoneNumberFromString(trimmedPhone, normalizedCountry as CountryCode);
        if (!parsed || !parsed.isValid()) {
          fieldErrors.phone = "Phone number is invalid for selected country";
        } else {
          const normalized = parsed.number;
          data.phone = normalized;
          data.phoneCountry = normalizedCountry;
          data.phoneE164 = normalized;
        }
      }
    }
  } else if (countryRaw !== undefined && countryRaw.trim().length > 0) {
    fieldErrors.phoneCountry = "Phone country cannot be updated without phone";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  return { ok: true, data };
}
