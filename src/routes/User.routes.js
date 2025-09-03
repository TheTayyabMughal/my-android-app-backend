import { Router } from "express";
import {
  Loginuser,
  getCurrentUser,
  LogoutUser,
  registerUser,
  testSendMail,
  verifyOtp,
  updatePassword,
  updateInfo,
  verifyEmailStep1,
  updatePasswordStep2,
  forgotPassword,
  resetPassword,
  verifyRegistrationOtp,
} from "../Controllers/User.controller.js";
import { upload } from "../middlewares/Multer.middleware.js";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";
const router = Router();

router
  .route("/register")
  .post(upload.fields([{ name: "profilePic", maxCount: 1 }]), registerUser);

router.route("/verify-registration-otp").post(verifyRegistrationOtp);

router.route("/login").post(Loginuser);
router.route("/verify-otp").post(verifyOtp);
router.route("/logout").post(verifyJWT, LogoutUser);
router.route("/getcurrent").get(verifyJWT, getCurrentUser);
router.route("/sendmail").post(testSendMail);
router.route("/updatePassword").put(verifyJWT, updatePassword);
router.route("/updateinfo").put(verifyJWT, updateInfo);
router.route("/verifyEmail").put(verifyJWT, verifyEmailStep1);
router.route("/updatestep2").put(verifyJWT, updatePasswordStep2);

router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword").put(resetPassword);

export default router;
