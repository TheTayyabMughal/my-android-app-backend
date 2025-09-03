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
  getOrderAnalytics
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
router.post("/create", verifyJWT, verifyCustomer, createOrder);
router.post("/confirm-payment", verifyJWT, verifyCustomer, confirmPayment);
router.get("/my-orders", verifyJWT, verifyCustomer, getUserOrders);
router.get("/details/:id", verifyJWT, getOrderById);
router.patch("/cancel/:id", verifyJWT, verifyCustomer, cancelOrder);

// Service Provider routes
router.get("/provider-orders", verifyJWT, verifyProvider, getProviderOrders);
router.patch("/status/:id", verifyJWT, verifyProviderOrAdmin, updateOrderStatus);

// Admin routes
router.get("/all", verifyJWT, verifyAdmin, getAllOrders);
router.post("/assign-rider", verifyJWT, verifyAdmin, assignRider);
router.get("/analytics", verifyJWT, verifyAdmin, getOrderAnalytics);

export default router;
