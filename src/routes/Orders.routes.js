import express from "express";
import {
  createOrder,
  confirmPayment,
  getAllOrders,
  getUserOrders,
  getProviderOrders,
  getOrderById,
  updateOrderStatus,
  assignRider,
  cancelOrder,
  getOrderAnalytics,
  createPaymentIntent,
  addMeasurements
} from "../Controllers/Orders.controller.js";
import { 
  verifyJWT, 
  verifyAdmin, 
  verifyProvider, 
  verifyProviderOrAdmin,
  verifyCustomer
} from "../middlewares/Authentication.middleware.js";

const router = express.Router();

// Customer routes
router.post("/createOrder", verifyJWT, createOrder);
router.post("/confirm-payment", verifyJWT, verifyCustomer, confirmPayment);
router.get("/my-orders", verifyJWT, getUserOrders);
router.get("/details/:id", verifyJWT, getOrderById);
router.patch("/cancel/:id", verifyJWT, verifyCustomer, cancelOrder);
router.post("/create-payment-intent", verifyJWT, createPaymentIntent);
// Service Provider routes
router.get("/provider-orders", verifyJWT, getProviderOrders);
router.patch("/status/:orderTrackingId", verifyJWT, updateOrderStatus);
router.patch("/addMeasurement/:orderTrackingId", verifyJWT, addMeasurements);

// Admin routes
router.get("/all", verifyJWT, verifyAdmin, getAllOrders);
router.post("/assign-rider", verifyJWT, verifyAdmin, assignRider);
router.get("/analytics", verifyJWT, verifyAdmin, getOrderAnalytics);

export default router;
