import { Router } from "express";
import {
  deleteAdminUser,
  getAdminAuditLogs,
  getAdminContentQueue,
  getAdminDashboard,
  getAdminDisputes,
  getAdminKycSubmissions,
  getAdminSystemHealth,
  getAdminUsers,
  patchAdminContentModeration,
  patchAdminDispute,
  patchAdminKycSubmission,
  patchAdminUserStatus,
} from "../controllers/admin.controller.js";
import { protect, requireRole } from "../utils/auth.js";

const router = Router();
router.use(protect, requireRole("admin", "superadmin"));

router.get("/dashboard", getAdminDashboard);
router.get("/system-health", getAdminSystemHealth);
router.get("/users", getAdminUsers);
router.get("/kyc-submissions", getAdminKycSubmissions);
router.patch("/kyc-submissions/:id/review", patchAdminKycSubmission);
router.get("/content", getAdminContentQueue);
router.patch("/content/:type/:id/moderate", patchAdminContentModeration);
router.patch("/users/:id/status", patchAdminUserStatus);
router.delete("/users/:id", deleteAdminUser);
router.get("/disputes", getAdminDisputes);
router.patch("/disputes/:id", patchAdminDispute);
router.get("/audit-logs", getAdminAuditLogs);

export default router;
