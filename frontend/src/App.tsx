import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import DashboardPage from "./pages/Dashboard";
import ProfilePage from "./pages/Profile";
import CoursesPage from "./pages/Courses";
import MyCoursesPage from "./pages/MyCourses";
import CourseDetailPage from "./pages/CourseDetail";
import LessonViewPage from "./pages/LessonView";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import InstructorDashboardPage from "./pages/InstructorDashboard";
import InstructorCreateCoursePage from "./pages/InstructorCreateCourse";
import InstructorCourseEditorPage from "./pages/InstructorCourseEditor";
import InstructorStudentsPage from "./pages/InstructorStudents";
import InstructorRequestsPage from "./pages/InstructorRequests";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsers";
import AdminCoursesPage from "./pages/AdminCourses";
import AdminEnrollmentsPage from "./pages/AdminEnrollments";
import AdminAuditLogsPage from "./pages/AdminAuditLogs";
import AdminInstructorsPage from "./pages/AdminInstructors";
import AdminInstructorDetailPage from "./pages/AdminInstructorDetail";
import AdminInboxPage from "./pages/AdminInbox";
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
    return <Navigate to="/dashboard" replace />;
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
              <DashboardPage />
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
          path="/courses"
          element={
            <ProtectedRoute>
              <CoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-courses"
          element={
            <ProtectedRoute>
              <MyCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons/:id"
          element={
            <ProtectedRoute>
              <LessonViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor"
          element={
            <RoleProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
              <InstructorDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/new"
          element={
            <RoleProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
              <InstructorCreateCoursePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:id"
          element={
            <RoleProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
              <InstructorCourseEditorPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:id/students"
          element={
            <RoleProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
              <InstructorStudentsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/instructor/requests"
          element={
            <RoleProtectedRoute roles={["INSTRUCTOR", "ADMIN"]}>
              <InstructorRequestsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminDashboardPage />
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
          path="/admin/inbox"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminInboxPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/instructors"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminInstructorsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/instructors/:id"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminInstructorDetailPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminCoursesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/enrollments"
          element={
            <RoleProtectedRoute roles={["ADMIN"]}>
              <AdminEnrollmentsPage />
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
