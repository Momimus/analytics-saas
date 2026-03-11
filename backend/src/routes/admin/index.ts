import { Router } from "express";
import { requireAdminConsoleRole, requireAuth } from "../../middleware/auth.js";
import userRoutes from "./users.js";
import auditRoutes from "./audit.js";
import analyticsRoutes from "../admin.analytics.routes.js";

const router = Router();

router.use(requireAuth, requireAdminConsoleRole());
router.use(userRoutes);
router.use(auditRoutes);
router.use(analyticsRoutes);

export default router;
