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

export default router;
