import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import userRoutes from "./users.js";
import auditRoutes from "./audit.js";
import analyticsRoutes from "../admin.analytics.routes.js";

const router = Router();

router.use(requireAuth, requireRole([Role.ADMIN]));
router.use(userRoutes);
router.use(auditRoutes);
router.use(analyticsRoutes);

export default router;
