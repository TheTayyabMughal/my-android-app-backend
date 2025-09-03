import { Router } from "express";
import {
  createApplication,
  getAllApplications,
  getAllPendingApplications,
  getAllApprovedApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  verifyApplicationOtp,
} from "../Controllers/Applications.controller.js";
import { verifyAdmin, verifyJWT } from "../middlewares/Authentication.middleware.js";

const router = Router();

router.route("/create").post(createApplication);
router.route("/verify-application-otp").post(verifyApplicationOtp);
router.route("/getAll").get(getAllApplications);
router.route("/getPending").get(getAllPendingApplications);
router.route("/getApproved").get(getAllApprovedApplications);
router.route("/getById/:id").get(getApplicationById);
router.route("/update/:id").put(updateApplication);
router.route("/updateStatus/:id").patch(verifyJWT,verifyAdmin,updateApplicationStatus);
router.route("/delete/:id").delete(deleteApplication);

export default router;
