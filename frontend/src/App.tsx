import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import ProfilePage from "./pages/Profile";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import AdminAnalyticsPage from "./pages/AdminAnalytics";
import AdminProductsPage from "./pages/AdminProducts";
import AdminOrdersPage from "./pages/AdminOrders";
import AdminEventsPage from "./pages/AdminEvents";
import AdminAuditLogsPage from "./pages/AdminAuditLogs";
import AdminSettingsPage from "./pages/AdminSettings";
import AdminUsersPage from "./pages/AdminUsers";
import AdminWorkspacePage from "./pages/AdminWorkspace";
import NotFound404Page from "./pages/NotFound404";
import Forbidden403Page from "./pages/Forbidden403";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/auth";
import { useWorkspace } from "./context/workspace";
import { isSuperAdmin, type PlatformRole, type WorkspaceAccessRole } from "./lib/roles";
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
    return <Navigate to="/admin/analytics" replace />;
  }

  return <>{children}</>;
}

function RoleProtectedRoute({
  children,
  platformRoles,
  workspaceRoles,
}: PropsWithChildren<{
  platformRoles?: PlatformRole[];
  workspaceRoles?: WorkspaceAccessRole[];
}>) {
  const { user, loading } = useAuth();
  const { currentWorkspaceRole, loading: workspaceLoading } = useWorkspace();

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

  if (platformRoles && !platformRoles.includes(user.role)) {
    return <Forbidden403Page currentRole={user.role} requiredRoles={platformRoles} labelMode="platform" />;
  }

  if (workspaceRoles && !isSuperAdmin(user.role)) {
    if (workspaceLoading) {
      return (
        <div className="card-animate w-full max-w-xl rounded-[var(--radius-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)] md:p-7">
          Loading...
        </div>
      );
    }

    if (!currentWorkspaceRole || !workspaceRoles.includes(currentWorkspaceRole)) {
      return <Forbidden403Page currentRole={currentWorkspaceRole ?? user.role} requiredRoles={workspaceRoles} labelMode="workspace" />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  const { selectedWorkspaceId } = useWorkspace();

  return (
    <AppShell>
      <Routes key={selectedWorkspaceId ?? "no-workspace"}>
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
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <Navigate to="/admin/analytics" replace />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/workspace"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <AdminWorkspacePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <AdminAnalyticsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <AdminProductsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <AdminOrdersPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_VIEWER"]}>
              <AdminEventsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN"]}>
              <AdminAuditLogsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleProtectedRoute platformRoles={["SUPER_ADMIN"]}>
              <AdminUsersPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleProtectedRoute workspaceRoles={["SUPER_ADMIN", "WORKSPACE_ADMIN"]}>
              <AdminSettingsPage />
            </RoleProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound404Page />} />
      </Routes>
    </AppShell>
  );
}
