import { apiFetch } from "./api";

export type AdminUser = {
  id: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  fullName: string | null;
  createdAt: string;
  suspendedAt: string | null;
};

export type AdminCourse = {
  id: string;
  title: string;
  isPublished: boolean;
  archivedAt: string | null;
  updatedAt: string;
  createdById: string | null;
  createdBy: { id: string; email: string; fullName: string | null } | null;
  _count: {
    lessons: number;
    enrollments: number;
    deletionRequests: number;
  };
};

export type AdminEnrollment = {
  id: string;
  userId: string;
  courseId: string;
  status: "REQUESTED" | "ACTIVE" | "REVOKED";
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; fullName: string | null };
  course: { id: string; title: string; archivedAt: string | null };
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} & T;

export type AdminMetrics = {
  users: { total: number; suspended: number };
  instructors: { total: number; suspended: number };
  courses: { total: number; published: number; unpublished: number; archived: number };
  enrollments: { total: number; pendingRequests: number; active: number };
  deletionRequests: { pending: number };
};

export type AdminInstructorListItem = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  suspendedAt: string | null;
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
};

export type AdminInstructorDetail = {
  instructor: {
    id: string;
    email: string;
    role: "INSTRUCTOR";
    fullName: string | null;
    createdAt: string;
    suspendedAt: string | null;
  };
  counts: {
    totalCourses: number;
    publishedCourses: number;
    unpublishedCourses: number;
    archivedCourses: number;
    totalStudents: number;
  };
};

export type AdminInstructorStudent = {
  id: string;
  email: string;
  fullName: string | null;
  firstEnrolledAt: string;
  activeCourses: number;
};

export function listAdminUsers(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ users: AdminUser[] }>>(`/admin/users?${params.toString()}`);
}

export function listAdminCourses(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ courses: AdminCourse[] }>>(`/admin/courses?${params.toString()}`);
}

export function listAdminEnrollments(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ enrollments: AdminEnrollment[] }>>(`/admin/enrollments?${params.toString()}`);
}

export function listAdminAuditLogs(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ logs: AuditLog[] }>>(`/admin/audit-logs?${params.toString()}`);
}

export function listAdminDeletionRequests(params?: URLSearchParams) {
  const query = params && params.toString() ? `?${params.toString()}` : "";
  return apiFetch<{ requests: Array<{
    id: string;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    adminNote: string | null;
    createdAt: string;
    decidedAt: string | null;
    course: {
      id: string;
      title: string;
      archivedAt: string | null;
      createdById: string | null;
    };
    requestedBy: {
      id: string;
      email: string;
      fullName: string | null;
    };
    decidedBy: {
      id: string;
      email: string;
      fullName: string | null;
    } | null;
  }> }>(`/admin/delete-requests${query}`);
}

export function getAdminMetrics() {
  return apiFetch<AdminMetrics>("/admin/metrics");
}

export function listAdminInstructors(params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ instructors: AdminInstructorListItem[] }>>(
    `/admin/instructors?${params.toString()}`
  );
}

export function getAdminInstructor(id: string) {
  return apiFetch<AdminInstructorDetail>(`/admin/instructors/${id}`);
}

export function listAdminInstructorCourses(id: string, params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ courses: AdminCourse[] }>>(
    `/admin/instructors/${id}/courses?${params.toString()}`
  );
}

export function listAdminInstructorStudents(id: string, params: URLSearchParams) {
  return apiFetch<PaginatedResponse<{ students: AdminInstructorStudent[] }>>(
    `/admin/instructors/${id}/students?${params.toString()}`
  );
}
