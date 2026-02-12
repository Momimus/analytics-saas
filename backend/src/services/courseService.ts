import prisma from "../lib/prisma.js";

export async function listCourses() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lessons: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
  });

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
    createdBy: {
      fullName: course.createdBy?.fullName ?? null,
      email: course.createdBy?.email ?? null,
    },
  }));
}

export async function getCourseById(id: string) {
  return prisma.course.findFirst({
    where: { id, isPublished: true, archivedAt: null },
    include: { createdBy: { select: { fullName: true, email: true } } },
  });
}

export async function getPublicCourseById(id: string) {
  const course = await prisma.course.findFirst({
    where: { id, isPublished: true, archivedAt: null },
    include: {
      _count: { select: { lessons: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
  });
  if (!course) {
    return null;
  }

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    imageUrl: course.imageUrl,
    isPublished: course.isPublished,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    lessonsCount: course._count.lessons,
    createdBy: {
      fullName: course.createdBy?.fullName ?? null,
      email: course.createdBy?.email ?? null,
    },
  };
}

export async function getCourseByIdUnrestricted(id: string) {
  return prisma.course.findUnique({ where: { id } });
}

export async function createCourse(data: {
  title: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  imageUrl?: string | null;
  createdById: string;
}) {
  return prisma.course.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      level: data.level ?? null,
      imageUrl: data.imageUrl ?? null,
      createdById: data.createdById,
      isPublished: false,
    },
  });
}
