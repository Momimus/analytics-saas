import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import userRoutes from "./users.js";
import auditRoutes from "./audit.js";

const router = Router();

router.use(requireAuth, requireRole([Role.ADMIN]));
router.use(userRoutes);
router.use(auditRoutes);

export default router;
