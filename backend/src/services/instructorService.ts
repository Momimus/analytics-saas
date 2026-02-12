import { EnrollmentStatus, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { HttpError } from "../utils/httpError.js";

type Actor = {
  id: string;
  role: Role;
};

type CourseInput = {
  title: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  imageUrl?: string | null;
};

function buildCourseOwnershipWhere(id: string, actor: Actor) {
  if (actor.role === Role.ADMIN) {
    return { id, archivedAt: null };
  }
  return { id, createdById: actor.id, archivedAt: null };
}

export async function listInstructorCourses(actor: Actor) {
  const where = actor.role === Role.ADMIN ? { archivedAt: null } : { createdById: actor.id, archivedAt: null };
  const courses = await prisma.course.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { lessons: true, enrollments: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
  });

  const activeEnrollmentsByCourse = new Map<string, number>();
  if (courses.length > 0) {
    const grouped = await prisma.enrollment.groupBy({
      by: ["courseId"],
      where: {
        courseId: { in: courses.map((course) => course.id) },
        status: EnrollmentStatus.ACTIVE,
      },
      _count: { courseId: true },
    });
    for (const item of grouped) {
      activeEnrollmentsByCourse.set(item.courseId, item._count.courseId);
    }
  }

  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    imageUrl: course.imageUrl,
    isPublished: course.isPublished,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    lessonsCount: course._count.lessons,
    enrollmentsCount: activeEnrollmentsByCourse.get(course.id) ?? 0,
    createdBy: {
      fullName: course.createdBy?.fullName ?? null,
      email: course.createdBy?.email ?? null,
    },
  }));
}

export async function getInstructorCourseById(courseId: string, actor: Actor) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    include: { _count: { select: { lessons: true, enrollments: true } } },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const activeEnrollmentCount = await prisma.enrollment.count({
    where: { courseId: course.id, status: EnrollmentStatus.ACTIVE },
  });

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    imageUrl: course.imageUrl,
    isPublished: course.isPublished,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    lessonsCount: course._count.lessons,
    enrollmentsCount: activeEnrollmentCount,
  };
}

export async function createInstructorCourse(input: CourseInput, actor: Actor) {
  return prisma.course.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      level: input.level ?? null,
      imageUrl: input.imageUrl ?? null,
      createdById: actor.id,
      isPublished: false,
    },
  });
}

export async function updateInstructorCourse(courseId: string, input: Partial<CourseInput>, actor: Actor) {
  const existing = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!existing) {
    throw new HttpError(404, "Course not found");
  }

  return prisma.course.update({
    where: { id: courseId },
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      level: input.level,
      imageUrl: input.imageUrl,
    },
  });
}

export async function addInstructorLesson(
  courseId: string,
  actor: Actor,
  data: { title: string; videoUrl?: string | null; pdfUrl?: string | null }
) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  return prisma.lesson.create({
    data: {
      courseId,
      title: data.title,
      videoUrl: data.videoUrl ?? null,
      pdfUrl: data.pdfUrl ?? null,
    },
  });
}

export async function listInstructorLessons(courseId: string, actor: Actor) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      pdfUrl: true,
      createdAt: true,
    },
  });
}

export async function updateInstructorLesson(
  lessonId: string,
  actor: Actor,
  data: { title?: string; videoUrl?: string | null; pdfUrl?: string | null }
) {
  const lesson = await prisma.lesson.findFirst({
    where:
      actor.role === Role.ADMIN
        ? { id: lessonId }
        : {
            id: lessonId,
            course: { createdById: actor.id },
          },
    select: { id: true },
  });
  if (!lesson) {
    throw new HttpError(404, "Lesson not found");
  }

  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: data.title,
      videoUrl: data.videoUrl,
      pdfUrl: data.pdfUrl,
    },
  });
}

export async function deleteInstructorLesson(lessonId: string, actor: Actor) {
  const lesson = await prisma.lesson.findFirst({
    where:
      actor.role === Role.ADMIN
        ? { id: lessonId }
        : {
            id: lessonId,
            course: { createdById: actor.id },
          },
    select: { id: true },
  });
  if (!lesson) {
    throw new HttpError(404, "Lesson not found");
  }

  await prisma.lesson.delete({ where: { id: lessonId } });
}

export async function setCoursePublishState(courseId: string, actor: Actor, isPublished: boolean) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished },
  });
}

export async function listInstructorCourseStudents(courseId: string, actor: Actor) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const [enrollments, lessons] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId, status: EnrollmentStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    }),
  ]);

  const totalLessons = lessons.length;
  const completedByUser = new Map<string, number>();

  if (totalLessons > 0) {
    const grouped = await prisma.lessonProgress.groupBy({
      by: ["userId"],
      where: {
        lessonId: { in: lessons.map((lesson) => lesson.id) },
        completedAt: { not: null },
      },
      _count: { userId: true },
    });

    for (const item of grouped) {
      completedByUser.set(item.userId, item._count.userId);
    }
  }

  return enrollments.map((enrollment) => {
    const completedLessons = completedByUser.get(enrollment.user.id) ?? 0;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      userId: enrollment.user.id,
      name: enrollment.user.fullName,
      email: enrollment.user.email,
      enrolledAt: enrollment.createdAt,
      completedLessons,
      totalLessons,
      progressPercent,
    };
  });
}

export async function listInstructorCourseRequests(courseId: string, actor: Actor) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  return prisma.enrollment.findMany({
    where: { courseId, status: EnrollmentStatus.REQUESTED },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });
}

export async function requestCourseDeletion(courseId: string, reason: string, actor: Actor) {
  const course = await prisma.course.findFirst({
    where: buildCourseOwnershipWhere(courseId, actor),
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const existingPending = await prisma.deletionRequest.findFirst({
    where: {
      courseId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existingPending) {
    throw new HttpError(409, "A deletion request is already pending for this course");
  }

  return prisma.deletionRequest.create({
    data: {
      courseId,
      requestedById: actor.id,
      reason,
      status: "PENDING",
    },
    select: {
      id: true,
      courseId: true,
      requestedById: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  nextStatus: "ACTIVE" | "REVOKED",
  actor: Actor
) {
  const enrollment = await prisma.enrollment.findFirst({
    where:
      actor.role === Role.ADMIN
        ? { id: enrollmentId }
        : {
            id: enrollmentId,
            course: { createdById: actor.id },
          },
    select: { id: true },
  });

  if (!enrollment) {
    throw new HttpError(404, "Enrollment request not found");
  }

  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: nextStatus },
    select: {
      id: true,
      courseId: true,
      userId: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function hardDeleteCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) {
    throw new HttpError(404, "Course not found");
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true },
  });
  const lessonIds = lessons.map((lesson) => lesson.id);

  await prisma.$transaction(async (tx) => {
    if (lessonIds.length > 0) {
      await tx.lessonProgress.deleteMany({
        where: { lessonId: { in: lessonIds } },
      });
      await tx.lesson.deleteMany({
        where: { id: { in: lessonIds } },
      });
    }

    await tx.enrollment.deleteMany({
      where: { courseId },
    });

    await tx.course.delete({
      where: { id: courseId },
    });
  });

  return { deletedId: courseId };
}
