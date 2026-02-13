import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { getCourseById } from "../services/courseService.js";
import {
  listMyEnrollmentStatuses,
  requestCourseAccess,
  getMyCourses,
  getMyProgress,
  getLessonById,
  markLessonComplete,
  uncompleteLesson,
} from "../services/studentService.js";

const router = Router();

function getRouteId(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  throw new HttpError(400, "Invalid route parameter");
}

function requireUserId(userId: string | undefined): string {
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
}

router.post(
  "/courses/:id/request-access",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const courseId = getRouteId(req.params.id);
    const course = await getCourseById(courseId);
    if (!course) {
      throw new HttpError(404, "Course not found");
    }
    const enrollment = await requestCourseAccess(userId, courseId);
    return res.status(201).json({ ok: true, enrollment });
  })
);

router.post(
  "/courses/:id/enroll",
  requireAuth,
  requireRole([Role.STUDENT]),
  // Deprecated alias for backward compatibility. Use POST /courses/:id/request-access.
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const courseId = getRouteId(req.params.id);
    const course = await getCourseById(courseId);
    if (!course) {
      throw new HttpError(404, "Course not found");
    }
    const enrollment = await requestCourseAccess(userId, courseId);
    return res.status(201).json({ ok: true, enrollment });
  })
);

router.get(
  "/my/enrollments",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const enrollments = await listMyEnrollmentStatuses(userId);
    return res.json({ enrollments });
  })
);

router.get(
  "/my/courses",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const courses = await getMyCourses(userId);
    return res.json({ courses });
  })
);

router.get(
  "/my/progress",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const summary = await getMyProgress(userId);
    return res.json(summary);
  })
);

router.get(
  "/lessons/:id",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const lessonId = getRouteId(req.params.id);
    const lesson = await getLessonById(userId, lessonId);
    return res.json({ lesson });
  })
);

router.post(
  "/lessons/:id/complete",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const lessonId = getRouteId(req.params.id);
    const progress = await markLessonComplete(userId, lessonId);
    return res.json({ progress });
  })
);

router.post(
  "/lessons/:id/uncomplete",
  requireAuth,
  requireRole([Role.STUDENT]),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req.user?.id);
    const lessonId = getRouteId(req.params.id);
    await uncompleteLesson(userId, lessonId);
    return res.status(204).send();
  })
);

export default router;
