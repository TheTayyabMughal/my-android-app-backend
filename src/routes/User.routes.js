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
  getProfileInfo,
  registerProvider,
  updateProfilePic,
  removeProfilePic,
  getProviderProfileInfo,
  updateProviderProfilePic,
  removeProviderProfilePic,
  updateProviderProfile,
  updateProviderShopAddress,
  forgotPasswordNew,
  resetPasswordNew
} from "../Controllers/User.controller.js";
import { uploadProfilePic } from "../middlewares/Multer.middleware.js";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";
const router = Router();

router
  .route("/register")
  .post(uploadProfilePic, registerUser);

router.route("/verify-registration-otp").post(verifyRegistrationOtp);
router.route("/profile").get(verifyJWT,getProfileInfo)
router.route("/login").post(Loginuser);
router.route("/register/provider").post(uploadProfilePic, registerProvider);
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

// New Separate Forgot Password Routes
router.route("/forgot-password").post(forgotPasswordNew);
router.route("/reset-password").put(resetPasswordNew);

// Profile picture routes
router.route("/profile-pic").put(verifyJWT, uploadProfilePic, updateProfilePic);
router.route("/profile-pic").delete(verifyJWT, removeProfilePic);

// Provider profile picture routes
router.route("/provider/profile").get(verifyJWT, getProviderProfileInfo);
router.route("/provider/profile").put(verifyJWT, updateProviderProfile);
router.route("/provider/shop-address").put(verifyJWT, updateProviderShopAddress);
router.route("/provider/profile-pic").put(verifyJWT, uploadProfilePic, updateProviderProfilePic);
router.route("/provider/profile-pic").delete(verifyJWT, removeProviderProfilePic);

export default router;
