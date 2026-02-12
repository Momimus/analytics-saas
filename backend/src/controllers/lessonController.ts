import type { Request, Response } from "express";
import { EnrollmentStatus, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError, assertNonEmptyString } from "../utils/httpError.js";
import type { AuthRequest } from "../middleware/auth.js";
import { getCourseById, getCourseByIdUnrestricted } from "../services/courseService.js";
import { createLesson, listLessonsByCourseWithProgress } from "../services/lessonService.js";
import { buildUploadPlaceholder } from "../services/uploadService.js";

function resolveOptionalUrl(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

export const getCourseLessons = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courseId = assertNonEmptyString(req.params.id, "Course id is required");
  const course = await getCourseById(courseId);

  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (req.user.role === Role.STUDENT) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: req.user.id,
          courseId,
        },
      },
      select: { status: true },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new HttpError(403, "Access requires approved enrollment");
    }
  }
  if (req.user.role === Role.INSTRUCTOR && course.createdById !== req.user.id) {
    throw new HttpError(403, "Use Instructor workspace to manage your own courses");
  }

  const lessons = await listLessonsByCourseWithProgress(courseId, req.user.id);
  res.json({ lessons });
});

export const postCourseLesson = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const courseId = assertNonEmptyString(req.params.id, "Course id is required");
  const course = await getCourseByIdUnrestricted(courseId);

  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  if (req.user.role !== Role.ADMIN && course.createdById !== req.user.id) {
    throw new HttpError(403, "Forbidden");
  }

  const title = assertNonEmptyString(req.body?.title, "Title is required");
  const videoUrl = resolveOptionalUrl(req.body?.videoUrl);
  const pdfUrl = resolveOptionalUrl(req.body?.pdfUrl);
  const videoFileName = resolveOptionalUrl(req.body?.videoFileName);
  const pdfFileName = resolveOptionalUrl(req.body?.pdfFileName);

  const resolvedVideoUrl = videoUrl ?? (videoFileName ? buildUploadPlaceholder("video", videoFileName) : null);
  const resolvedPdfUrl = pdfUrl ?? (pdfFileName ? buildUploadPlaceholder("pdf", pdfFileName) : null);

  const lesson = await createLesson({
    courseId,
    title,
    videoUrl: resolvedVideoUrl,
    pdfUrl: resolvedPdfUrl,
  });

  res.status(201).json({ lesson });
});
