import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

export type User = {
  id: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  createdAt?: string;
  fullName?: string | null;
  phone?: string | null;
  phoneCountry?: string | null;
  phoneE164?: string | null;
  address?: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const result = await apiFetch<{ user: User }>("/me");
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ user: User }>("/me");
      setUser(result.user);
    } catch {
      setUser(null);
      throw new Error("Unable to load session");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } catch {
      // Clear local auth state even if network logout fails.
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, setUser: (next: User) => setUser(next) }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
