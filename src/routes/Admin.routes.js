import { Router } from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  updateAdminProfilePic,
  removeAdminProfilePic,
  logoutAdmin,
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
  getNotificationsByRole,
} from "../Controllers/Admin.controller.js";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";
import { uploadProfilePic } from "../middlewares/Multer.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerAdmin);
router.route("/login").post(loginAdmin);

// Protected routes
router.route("/profile").get(verifyJWT, getAdminProfile);
router.route("/profile").put(verifyJWT, updateAdminProfile);
router.route("/password").put(verifyJWT, updateAdminPassword);
router.route("/profile-pic").put(verifyJWT, uploadProfilePic, updateAdminProfilePic);
router.route("/profile-pic").delete(verifyJWT, removeAdminProfilePic);
router.route("/logout").post(verifyJWT, logoutAdmin);

// Notification routes (Admin only)
router.route("/notifications").get(verifyJWT, getNotifications);
router.route("/notifications").post(verifyJWT, createNotification);
router.route("/notifications/:id").get(verifyJWT, getNotificationById);
router.route("/notifications/:id").put(verifyJWT, updateNotification);
router.route("/notifications/:id").delete(verifyJWT, deleteNotification);

// Public route for fetching role-specific notifications
router.route("/notifications/role/:role").get(getNotificationsByRole);

export default router;
