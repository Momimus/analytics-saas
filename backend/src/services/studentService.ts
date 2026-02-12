import prisma from "../lib/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { EnrollmentStatus } from "@prisma/client";

async function assertActiveEnrollmentForCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { status: true },
  });

  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new HttpError(403, "Access requires approved enrollment");
  }
}

export async function requestCourseAccess(userId: string, courseId: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, userId: true, courseId: true, status: true, createdAt: true, updatedAt: true },
  });
  if (existing?.status === EnrollmentStatus.ACTIVE) {
    return existing;
  }

  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { status: EnrollmentStatus.REQUESTED },
    create: { userId, courseId, status: EnrollmentStatus.REQUESTED },
  });
}

export async function getMyCourses(userId: string) {
  const courses = await prisma.course.findMany({
    where: {
      archivedAt: null,
      enrollments: { some: { userId, status: EnrollmentStatus.ACTIVE } },
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lessons: true } } },
  });

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    createdAt: course.createdAt,
    lessonsCount: course._count.lessons,
  }));
}

export async function getMyProgress(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: EnrollmentStatus.ACTIVE, course: { archivedAt: null } },
    select: { courseId: true },
  });

  const courseIds = enrollments.map((item) => item.courseId);

  if (courseIds.length === 0) {
    return {
      totalEnrolledCourses: 0,
      totalLessonsCompleted: 0,
      perCourse: [],
    };
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId: { in: courseIds } },
    select: {
      id: true,
      courseId: true,
      progress: {
        where: { userId, completedAt: { not: null } },
        select: { id: true },
      },
    },
  });

  const perCourse: Record<string, { courseId: string; completedLessons: number; totalLessons: number }> = {};

  for (const courseId of courseIds) {
    perCourse[courseId] = { courseId, completedLessons: 0, totalLessons: 0 };
  }

  let totalCompleted = 0;

  for (const lesson of lessons) {
    const entry = perCourse[lesson.courseId];
    if (!entry) continue;
    entry.totalLessons += 1;
    if (lesson.progress.length > 0) {
      entry.completedLessons += 1;
      totalCompleted += 1;
    }
  }

  return {
    totalEnrolledCourses: courseIds.length,
    totalLessonsCompleted: totalCompleted,
    perCourse: Object.values(perCourse),
  };
}

export async function getLessonById(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      pdfUrl: true,
      courseId: true,
      progress: {
        where: { userId, completedAt: { not: null } },
        select: { completedAt: true },
      },
    },
  });

  if (!lesson) {
    throw new HttpError(404, "Lesson not found");
  }

  await assertActiveEnrollmentForCourse(userId, lesson.courseId);

  return {
    id: lesson.id,
    title: lesson.title,
    videoUrl: lesson.videoUrl,
    pdfUrl: lesson.pdfUrl,
    courseId: lesson.courseId,
    completed: lesson.progress.length > 0,
  };
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) {
    throw new HttpError(404, "Lesson not found");
  }

  await assertActiveEnrollmentForCourse(userId, lesson.courseId);

  return prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completedAt: new Date() },
    create: { userId, lessonId, completedAt: new Date() },
  });
}

export async function uncompleteLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) {
    throw new HttpError(404, "Lesson not found");
  }

  await assertActiveEnrollmentForCourse(userId, lesson.courseId);

  await prisma.lessonProgress.deleteMany({
    where: { userId, lessonId },
  });
}

export async function listMyEnrollmentStatuses(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId, course: { archivedAt: null } },
    select: {
      courseId: true,
      status: true,
      updatedAt: true,
    },
  });
}
