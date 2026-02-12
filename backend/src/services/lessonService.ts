import prisma from "../lib/prisma.js";

export async function listLessonsByCourseWithProgress(courseId: string, userId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      courseId: true,
      title: true,
      videoUrl: true,
      pdfUrl: true,
      createdAt: true,
      progress: {
        where: { userId, completedAt: { not: null } },
        select: { id: true },
      },
    },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    videoUrl: lesson.videoUrl,
    pdfUrl: lesson.pdfUrl,
    createdAt: lesson.createdAt,
    completed: lesson.progress.length > 0,
  }));
}

export async function createLesson(data: {
  courseId: string;
  title: string;
  videoUrl?: string | null;
  pdfUrl?: string | null;
}) {
  return prisma.lesson.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      videoUrl: data.videoUrl ?? null,
      pdfUrl: data.pdfUrl ?? null,
    },
  });
}
