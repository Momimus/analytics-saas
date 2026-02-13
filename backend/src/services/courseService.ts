import prisma from "../lib/prisma.js";

const courseListSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  level: true,
  imageUrl: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { lessons: true } },
  createdBy: { select: { fullName: true, email: true } },
} as const;

const publicCourseSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { lessons: true } },
  createdBy: { select: { fullName: true, email: true } },
} as const;

function mapCatalogCourse(course: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { lessons: number };
  createdBy: { fullName: string | null; email: string } | null;
}) {
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
    createdBy: {
      fullName: course.createdBy?.fullName ?? null,
      email: course.createdBy?.email ?? null,
    },
  };
}

function mapPublicCourse(course: {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { lessons: number };
  createdBy: { fullName: string | null; email: string } | null;
}) {
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

export async function listCourses() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: courseListSelect,
  });

  return courses.map(mapCatalogCourse);
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
    select: publicCourseSelect,
  });
  if (!course) {
    return null;
  }

  return mapPublicCourse(course);
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
