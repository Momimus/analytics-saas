import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import ProfilePage from "./pages/Profile";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import AdminAnalyticsPage from "./pages/AdminAnalytics";
import AdminUsersPage from "./pages/AdminUsers";
import AdminAuditLogsPage from "./pages/AdminAuditLogs";
import NotFound404Page from "./pages/NotFound404";
import Forbidden403Page from "./pages/Forbidden403";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/auth";
import type { PropsWithChildren } from "react";

function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)] md:p-7">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin/analytics" : "/profile"} replace />;
  }

  return <>{children}</>;
}

function RoleProtectedRoute({
  children,
  roles,
}: PropsWithChildren<{ roles: Array<"ADMIN" | "INSTRUCTOR" | "STUDENT"> }>) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)] md:p-7">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Forbidden403Page currentRole={user.role} requiredRoles={roles} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/profile" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <Navigate to="/admin/analytics" replace />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminAnalyticsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminUsersPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminAuditLogsPage />
            </RoleProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound404Page />} />
      </Routes>
    </AppShell>
  );
}
