import { EnrollmentStatus, Role } from "@prisma/client";
import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { HttpError, assertNonEmptyString } from "../utils/httpError.js";
import prisma from "../lib/prisma.js";
import { assertDirectImageUrl } from "../utils/url.js";
import type { AuthRequest } from "../middleware/auth.js";
import {
  createCourse,
  getCourseById,
  getPublicCourseById,
  listCourses,
} from "../services/courseService.js";

export const getCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await listCourses();
  res.json({ courses });
});

export const getCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = assertNonEmptyString(req.params.id, "Course id is required");
  const course = await getCourseById(id);

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
          courseId: id,
        },
      },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new HttpError(403, "Access requires approved enrollment");
    }
  }
  if (req.user.role === Role.INSTRUCTOR) {
    throw new HttpError(403, "Use Instructor workspace to manage your own courses");
  }

  res.json({ course });
});

export const getPublicCourse = asyncHandler(async (req: Request, res: Response) => {
  const id = assertNonEmptyString(req.params.id, "Course id is required");
  const course = await getPublicCourseById(id);

  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  res.json({ course });
});

function resolveOptionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return null;
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

export const postCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const title = assertNonEmptyString(req.body?.title, "Title is required");
  if (title.length > 120) {
    throw new HttpError(400, "Title must be at most 120 characters");
  }

  const description = resolveOptionalText(req.body?.description, 500);
  const category = resolveOptionalText(req.body?.category, 80);
  const level = resolveOptionalText(req.body?.level, 40);
  const imageUrl = resolveOptionalText(req.body?.imageUrl, 500);
  if (imageUrl) {
    assertDirectImageUrl(imageUrl);
  }

  const course = await createCourse({
    title,
    description,
    category,
    level,
    imageUrl,
    createdById: req.user.id,
  });
  res.status(201).json({ course });
});
