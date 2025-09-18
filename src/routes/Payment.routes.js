import { Router } from "express";
import { verifyJWT } from "../middlewares/Authentication.middleware.js";
import {
  getProviderPaymentMethod,
  updateProviderPaymentMethod,
  getProviderPaymentHistory,
  getAllProvidersPaymentSummary,
  makePaymentToProvider,
  getAdminPaymentHistory,
  getProviderAdminPaymentHistory
} from "../Controllers/Payment.controller.js";

const router = Router();

// Provider Payment Routes
router.route("/provider/method").get(verifyJWT, getProviderPaymentMethod);
router.route("/provider/method").put(verifyJWT, updateProviderPaymentMethod);
router.route("/provider/history").get(verifyJWT, getProviderPaymentHistory);
router.route("/provider/admin-history").get(verifyJWT, getProviderAdminPaymentHistory);

// Admin Payment Routes
router.route("/admin/summary").get(verifyJWT, getAllProvidersPaymentSummary);
router.route("/admin/make-payment").post(verifyJWT, makePaymentToProvider);
router.route("/admin/history").get(verifyJWT, getAdminPaymentHistory);

export default router;