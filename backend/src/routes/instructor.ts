import { Router } from "express";
import { EnrollmentStatus, Role } from "@prisma/client";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { HttpError, assertNonEmptyString } from "../utils/httpError.js";
import { assertDirectImageUrl, assertHttpOrUploadUrl } from "../utils/url.js";
import {
  addInstructorLesson,
  createInstructorCourse,
  deleteInstructorLesson,
  getInstructorCourseById,
  listInstructorCourses,
  listInstructorCourseStudents,
  listInstructorCourseRequests,
  listInstructorRequests,
  listInstructorLessons,
  requestCourseDeletion,
  setCoursePublishState,
  updateEnrollmentStatus,
  updateInstructorCourse,
  updateInstructorLesson,
} from "../services/instructorService.js";
import { writeAuditLog } from "../services/auditService.js";
import { buildUploadPlaceholder } from "../services/uploadService.js";
import { getRequestMeta } from "../utils/requestMeta.js";

const router = Router();

function getActor(req: AuthRequest) {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return req.user;
}

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "Invalid payload");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `Field must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function optionalImageUrl(value: unknown) {
  const normalized = optionalString(value, 500);
  if (!normalized) return normalized;
  assertDirectImageUrl(normalized);
  return normalized;
}

function optionalLessonUrl(value: unknown, label: "Video URL" | "PDF URL") {
  const normalized = optionalString(value, 500);
  if (!normalized) return normalized;
  assertHttpOrUploadUrl(normalized, `${label} must be an absolute http(s) URL or uploaded file path`);
  return normalized;
}

router.use(requireAuth, requireRole([Role.INSTRUCTOR, Role.ADMIN]));

router.get(
  "/requests",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const limitRaw = req.query.limit;
    let limit: number | undefined;
    if (typeof limitRaw === "string" && limitRaw.trim().length > 0) {
      const parsed = Number(limitRaw);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100) {
        throw new HttpError(400, "limit must be an integer between 1 and 100");
      }
      limit = parsed;
    }
    const result = await listInstructorRequests(actor, limit);
    res.json(result);
  })
);

router.get(
  "/courses",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courses = await listInstructorCourses(actor);
    res.json({ courses });
  })
);

router.get(
  "/courses/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const course = await getInstructorCourseById(courseId, actor);
    res.json({ course });
  })
);

router.get(
  "/courses/:id/lessons",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const lessons = await listInstructorLessons(courseId, actor);
    res.json({ lessons });
  })
);

router.post(
  "/courses",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const title = assertNonEmptyString(req.body?.title, "Title is required");
    if (title.length > 120) {
      throw new HttpError(400, "Title must be at most 120 characters");
    }

    const course = await createInstructorCourse(
      {
        title,
        description: optionalString(req.body?.description, 500),
        category: optionalString(req.body?.category, 80),
        level: optionalString(req.body?.level, 40),
        imageUrl: optionalImageUrl(req.body?.imageUrl),
      },
      actor
    );

    res.status(201).json({ course });
  })
);

router.patch(
  "/courses/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const payload: {
      title?: string;
      description?: string | null;
      category?: string | null;
      level?: string | null;
      imageUrl?: string | null;
    } = {};

    if (req.body?.title !== undefined) {
      const title = assertNonEmptyString(req.body?.title, "Title is required");
      if (title.length > 120) {
        throw new HttpError(400, "Title must be at most 120 characters");
      }
      payload.title = title;
    }
    if (req.body?.description !== undefined) payload.description = optionalString(req.body?.description, 500);
    if (req.body?.category !== undefined) payload.category = optionalString(req.body?.category, 80);
    if (req.body?.level !== undefined) payload.level = optionalString(req.body?.level, 40);
    if (req.body?.imageUrl !== undefined) payload.imageUrl = optionalImageUrl(req.body?.imageUrl);

    const course = await updateInstructorCourse(courseId, payload, actor);
    res.json({ course });
  })
);

router.post(
  "/courses/:id/lessons",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const title = assertNonEmptyString(req.body?.title, "Title is required");
    if (title.length > 120) {
      throw new HttpError(400, "Title must be at most 120 characters");
    }
    const videoUrlRaw = optionalLessonUrl(req.body?.videoUrl, "Video URL");
    const pdfUrlRaw = optionalLessonUrl(req.body?.pdfUrl, "PDF URL");
    const videoFileName = optionalString(req.body?.videoFileName, 120);
    const pdfFileName = optionalString(req.body?.pdfFileName, 120);

    const lesson = await addInstructorLesson(courseId, actor, {
      title,
      videoUrl: videoUrlRaw ?? (videoFileName ? buildUploadPlaceholder("video", videoFileName) : null),
      pdfUrl: pdfUrlRaw ?? (pdfFileName ? buildUploadPlaceholder("pdf", pdfFileName) : null),
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "LESSON_CREATED",
      entityType: "Lesson",
      entityId: lesson.id,
      metadata: { courseId },
      ip,
      userAgent,
    });

    res.status(201).json({ lesson });
  })
);

router.patch(
  "/lessons/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const lessonId = assertNonEmptyString(req.params.id, "Lesson id is required");
    const payload: { title?: string; videoUrl?: string | null; pdfUrl?: string | null } = {};

    if (req.body?.title !== undefined) {
      const title = assertNonEmptyString(req.body?.title, "Title is required");
      if (title.length > 120) {
        throw new HttpError(400, "Title must be at most 120 characters");
      }
      payload.title = title;
    }
    if (req.body?.videoUrl !== undefined) payload.videoUrl = optionalLessonUrl(req.body?.videoUrl, "Video URL");
    if (req.body?.pdfUrl !== undefined) payload.pdfUrl = optionalLessonUrl(req.body?.pdfUrl, "PDF URL");

    const lesson = await updateInstructorLesson(lessonId, actor, payload);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "LESSON_UPDATED",
      entityType: "Lesson",
      entityId: lesson.id,
      metadata: { lessonId },
      ip,
      userAgent,
    });

    res.json({ lesson });
  })
);

router.delete(
  "/lessons/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const lessonId = assertNonEmptyString(req.params.id, "Lesson id is required");
    await deleteInstructorLesson(lessonId, actor);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "LESSON_DELETED",
      entityType: "Lesson",
      entityId: lessonId,
      metadata: { lessonId },
      ip,
      userAgent,
    });

    res.json({ ok: true, deletedId: lessonId });
  })
);

router.post(
  "/courses/:id/delete-request",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const reason = assertNonEmptyString(req.body?.reason, "Deletion reason is required");
    if (reason.length > 1000) {
      throw new HttpError(400, "Reason must be at most 1000 characters");
    }
    const request = await requestCourseDeletion(courseId, reason, actor);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_DELETE_REQUESTED",
      entityType: "Course",
      entityId: courseId,
      metadata: { deletionRequestId: request.id, reasonLength: reason.length },
      ip,
      userAgent,
    });

    res.status(201).json({ ok: true, request });
  })
);

router.post(
  "/courses/:id/publish",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const course = await setCoursePublishState(courseId, actor, true);
    res.json({ course });
  })
);

router.post(
  "/courses/:id/unpublish",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const course = await setCoursePublishState(courseId, actor, false);
    res.json({ course });
  })
);

router.get(
  "/courses/:id/requests",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const requests = await listInstructorCourseRequests(courseId, actor);
    res.json({ requests });
  })
);

router.post(
  "/enrollments/:id/approve",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const enrollmentId = assertNonEmptyString(req.params.id, "Enrollment id is required");
    const enrollment = await updateEnrollmentStatus(enrollmentId, EnrollmentStatus.ACTIVE, actor);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ENROLLMENT_APPROVED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        courseId: enrollment.courseId,
        studentId: enrollment.userId,
        status: enrollment.status,
      },
      ip,
      userAgent,
    });

    res.json({ ok: true, enrollment });
  })
);

router.post(
  "/enrollments/:id/revoke",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const enrollmentId = assertNonEmptyString(req.params.id, "Enrollment id is required");
    const enrollment = await updateEnrollmentStatus(enrollmentId, EnrollmentStatus.REVOKED, actor);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ENROLLMENT_REVOKED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        courseId: enrollment.courseId,
        studentId: enrollment.userId,
        status: enrollment.status,
      },
      ip,
      userAgent,
    });

    res.json({ ok: true, enrollment });
  })
);

router.get(
  "/courses/:id/students",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const students = await listInstructorCourseStudents(courseId, actor);
    res.json({ students });
  })
);

export default router;
