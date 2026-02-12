import { Router } from "express";
import { Role } from "@prisma/client";
import { getCourse, getCourses, postCourse } from "../controllers/courseController.js";
import { getCourseLessons, postCourseLesson } from "../controllers/lessonController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", getCourses);
router.get("/:id/lessons", requireAuth, getCourseLessons);
router.post("/:id/lessons", requireAuth, requireRole([Role.INSTRUCTOR, Role.ADMIN]), postCourseLesson);
router.get("/:id", getCourse);
router.post("/", requireAuth, requireRole([Role.INSTRUCTOR, Role.ADMIN]), postCourse);

export default router;
