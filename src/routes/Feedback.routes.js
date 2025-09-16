import express from "express";
import {
  createFeedback,
  getFeedbacksByOrder,
  getFeedbacksByRider,
  getFeedbacksByProvider,
  getProviderForFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackAnalytics,
} from "../Controllers/Feedback.controller.js";
import { verifyJWT, verifyAdmin, verifyProviderOrAdmin, verifyCustomer } from "../middlewares/Authentication.middleware.js";

const router = express.Router();

router.post("/create", verifyJWT, createFeedback); 
router.get("/order/:orderId", getFeedbacksByOrder);
router.get("/rider/:riderId", getFeedbacksByRider); 
router.get("/:id/reviews",verifyJWT, getFeedbacksByProvider); 
router.get("/getProviderForFeedback", verifyJWT,getProviderForFeedback);
router.put("/:id", verifyJWT, verifyCustomer, updateFeedback);
router.delete("/:id", verifyJWT, verifyProviderOrAdmin, deleteFeedback); 
router.get("/analytics", verifyJWT, verifyAdmin, getFeedbackAnalytics);

export default router;
