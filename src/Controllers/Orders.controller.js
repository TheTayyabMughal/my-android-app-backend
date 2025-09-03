import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Orders } from "../models/Orders.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Riders } from "../models/Rider.model.js";
import { Users } from "../models/Users.model.js";
import { Measurements } from "../models/Measurements.model.js";
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key');

// Check if Stripe key is properly configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("WARNING: STRIPE_SECRET_KEY environment variable is not set. Using test mode. Payments won't be processed in production.");
}

// Create order with Stripe payment
const createOrder = asynchandler(async (req, res) => {
  const {
    orders,
    deliveryAddress,
    paymentMethod,
    specialInstructions,
    priority = "Medium"
  } = req.body;

  const userId = req.user._id;

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    throw new Apierror(400, "Valid order items are required");
  }

  // Validate each order item
  for (const item of orders) {
    if (!item.ServiceId || !item.ServiceProviderId || !item.name || !item.price) {
      throw new Apierror(400, "Each order item must contain ServiceId, ServiceProviderId, name, and price");
    }
  }

  if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city) {
    throw new Apierror(400, "Valid delivery address with street and city is required");
  }
  
  if (!paymentMethod) {
    throw new Apierror(400, "Payment method is required");
  }

  // Calculate total
  const total = orders.reduce((sum, item) => sum + item.price, 0);

  let paymentIntentId = null;
  let paymentStatus = "Pending";

  // Handle Stripe payment
  if (paymentMethod === "stripe" || paymentMethod === "card") {
    try {
      // Validate total amount
      if (!total || total <= 0) {
        throw new Error("Invalid order total amount");
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Stripe expects cents
        currency: 'usd',
        metadata: {
          userId: userId.toString(),
          orderDescription: `Order for ${orders.length} services`
        }
      });

      if (!paymentIntent || !paymentIntent.id) {
        throw new Error("Failed to create payment intent");
      }

      paymentIntentId = paymentIntent.id;
      paymentStatus = paymentIntent.status === 'succeeded' ? 'Paid' : 'Pending';
      
    } catch (error) {
      console.error("Stripe payment error:", error);
      if (error.type && error.type.startsWith('Stripe')) {
        throw new Apierror(400, `Payment processing failed: ${error.message}`);
      } else {
        throw new Apierror(500, `Payment system error: ${error.message}`);
      }
    }
  }

  // Estimate delivery date (7 days from now for tailoring services)
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

  const order = await Orders.create({
    user: userId,
    orders,
    total,
    paymentMethod,
    paymentStatus,
    stripePaymentIntentId: paymentIntentId,
    deliveryAddress,
    estimatedDeliveryDate,
    specialInstructions,
    priority,
    statusHistory: [{
      status: "Pending",
      updatedBy: userId,
      updatedAt: new Date(),
      note: "Order created"
    }]
  });

  const populatedOrder = await Orders.findById(order._id)
    .populate('user', 'username email')
    .populate('orders.ServiceId')
    .populate('orders.ServiceProviderId')
    .populate('orders.measurements');

  res.status(201).json(
    new Apiresponse(201, {
      order: populatedOrder,
      clientSecret: paymentIntentId ? (await stripe.paymentIntents.retrieve(paymentIntentId)).client_secret : null
    }, "Order created successfully")
  );
});

// Confirm Stripe payment
const confirmPayment = asynchandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;

  const order = await Orders.findById(orderId);
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'Paid';
      order.status = 'Confirmed';
      order.statusHistory.push({
        status: 'Confirmed',
        updatedBy: order.user,
        updatedAt: new Date(),
        note: 'Payment confirmed'
      });
      await order.save();

      res.status(200).json(
        new Apiresponse(200, order, "Payment confirmed successfully")
      );
    } else {
      throw new Apierror(400, "Payment not successful");
    }
  } catch (error) {
    throw new Apierror(400, `Payment confirmation failed: ${error.message}`);
  }
});

// Get all orders (Admin only)
const getAllOrders = asynchandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    paymentStatus, 
    priority,
    sortBy = 'createdAt',
    sortOrder = 'desc' 
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (priority) filter.priority = priority;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const orders = await Orders.find(filter)
    .populate('user', 'username email')
    .populate('orders.ServiceId')
    .populate('orders.ServiceProviderId')
    .populate('rider', 'name phoneNo')
    .populate('feedback')
    .sort(sortOptions)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Orders.countDocuments(filter);

  res.status(200).json(
    new Apiresponse(200, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }, "Orders fetched successfully")
  );
});

// Get user's orders
const getUserOrders = asynchandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { user: userId };
  if (status) filter.status = status;

  const orders = await Orders.find(filter)
    .populate('orders.ServiceId')
    .populate('orders.ServiceProviderId')
    .populate('rider', 'name phoneNo')
    .populate('feedback')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Orders.countDocuments(filter);

  res.status(200).json(
    new Apiresponse(200, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    }, "User orders fetched successfully")
  );
});

// Get orders for service provider
const getProviderOrders = asynchandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get the service provider info
  const provider = await ServiceProviders.findOne({ user: userId });
  if (!provider) {
    throw new Apierror(404, "Service provider not found");
  }

  const { page = 1, limit = 10, status } = req.query;

  const filter = { 'orders.ServiceProviderId': provider._id };
  if (status) filter.status = status;

  const orders = await Orders.find(filter)
    .populate('user', 'username email')
    .populate('orders.ServiceId')
    .populate('orders.ServiceProviderId')
    .populate('rider', 'name phoneNo')
    .populate('feedback')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Orders.countDocuments(filter);

  res.status(200).json(
    new Apiresponse(200, {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    }, "Provider orders fetched successfully")
  );
});

// Get order by ID
const getOrderById = asynchandler(async (req, res) => {
  const { id } = req.params;

  const order = await Orders.findById(id)
    .populate('user', 'username email')
    .populate('orders.ServiceId')
    .populate('orders.ServiceProviderId')
    .populate('orders.measurements')
    .populate('rider', 'name phoneNo')
    .populate('feedback')
    .populate('statusHistory.updatedBy', 'username');

  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  // Check if user has permission to view this order
  const isAdmin = req.user.role === 'admin';
  const isOrderOwner = order.user._id.toString() === req.user._id.toString();
  
  // Find if the user is the service provider for any order item
  let isServiceProvider = false;
  if (!isAdmin && !isOrderOwner) {
    // Get provider ID for current user
    const provider = await ServiceProviders.findOne({ user: req.user._id });
    
    if (provider) {
      isServiceProvider = order.orders.some(item => 
        item.ServiceProviderId && 
        item.ServiceProviderId._id && 
        item.ServiceProviderId._id.toString() === provider._id.toString()
      );
    }
  }
  
  if (!isAdmin && !isOrderOwner && !isServiceProvider) {
    throw new Apierror(403, "Access denied");
  }

  res.status(200).json(
    new Apiresponse(200, order, "Order fetched successfully")
  );
});

// Update order status
const updateOrderStatus = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const updatedBy = req.user._id;

  const validStatuses = [
    "Pending", "Confirmed", "Processing", "Ready for Pickup", 
    "Out for Delivery", "Delivered", "Cancelled", "Refunded"
  ];

  if (!validStatuses.includes(status)) {
    throw new Apierror(400, "Invalid status");
  }

  const order = await Orders.findById(id);
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  // Update status and add to history
  order.status = status;
  order.statusHistory.push({
    status,
    updatedBy,
    updatedAt: new Date(),
    note
  });

  // Set actual delivery date if delivered
  if (status === "Delivered") {
    order.actualDeliveryDate = new Date();
  }

  await order.save();

  const updatedOrder = await Orders.findById(id)
    .populate('user', 'username email')
    .populate('statusHistory.updatedBy', 'username');

  res.status(200).json(
    new Apiresponse(200, updatedOrder, "Order status updated successfully")
  );
});

// Assign rider to order
const assignRider = asynchandler(async (req, res) => {
  const { orderId, riderId } = req.body;

  if (!orderId || !riderId) {
    throw new Apierror(400, "Order ID and Rider ID are required");
  }

  const order = await Orders.findById(orderId);
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  // Verify the order status is appropriate for delivery assignment
  const validStatusForDelivery = ["Ready for Pickup", "Processing", "Confirmed"];
  if (!validStatusForDelivery.includes(order.status)) {
    throw new Apierror(400, `Order cannot be assigned for delivery in ${order.status} status`);
  }

  const rider = await Riders.findById(riderId).populate('serviceProvider');
  if (!rider) {
    throw new Apierror(404, "Rider not found");
  }

  // Check if any order item belongs to the rider's service provider
  if (rider.serviceProvider) {
    const hasValidServiceProvider = order.orders.some(item => 
      item.ServiceProviderId && 
      item.ServiceProviderId.toString() === rider.serviceProvider._id.toString()
    );
    
    if (!hasValidServiceProvider && req.user.role !== 'admin') {
      throw new Apierror(400, "Rider must belong to one of the service providers in the order");
    }
  }

  order.rider = riderId;
  order.assignedAt = new Date();
  order.status = "Out for Delivery";
  order.statusHistory.push({
    status: "Out for Delivery",
    updatedBy: req.user._id,
    updatedAt: new Date(),
    note: `Assigned to rider: ${rider.name}`
  });

  await order.save();

  const updatedOrder = await Orders.findById(orderId)
    .populate('rider', 'name phoneNo')
    .populate('user', 'username email');

  res.status(200).json(
    new Apiresponse(200, updatedOrder, "Rider assigned successfully")
  );
});

// Cancel order
const cancelOrder = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Orders.findById(id);
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  // Check if order can be cancelled
  if (["Delivered", "Cancelled", "Refunded"].includes(order.status)) {
    throw new Apierror(400, "Order cannot be cancelled");
  }

  // Handle refund if payment was made
  if (order.paymentStatus === "Paid" && order.stripePaymentIntentId) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: 'requested_by_customer'
      });
      
      if (refund && refund.status === 'succeeded') {
        order.paymentStatus = "Refunded";
        console.log(`Successfully processed refund for order ${id}`);
      } else {
        console.warn(`Refund created but status is ${refund?.status || 'unknown'} for order ${id}`);
        order.paymentStatus = "Refund Pending";
      }
    } catch (error) {
      console.error("Refund failed:", error);
      
      // Add note about failed refund but continue with cancellation
      order.statusHistory.push({
        status: "Refund Failed",
        updatedBy: req.user._id,
        updatedAt: new Date(),
        note: `Refund attempted but failed: ${error.message}`
      });
      
      // Continue with cancellation even if refund fails
    }
  }

  order.status = "Cancelled";
  order.statusHistory.push({
    status: "Cancelled",
    updatedBy: req.user._id,
    updatedAt: new Date(),
    note: reason || "Order cancelled by user"
  });

  await order.save();

  res.status(200).json(
    new Apiresponse(200, order, "Order cancelled successfully")
  );
});

// Get order analytics (Admin only)
const getOrderAnalytics = asynchandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const analytics = await Orders.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$total" },
        averageOrderValue: { $avg: "$total" },
        statusBreakdown: {
          $push: {
            status: "$status",
            count: 1
          }
        }
      }
    }
  ]);

  const statusStats = await Orders.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const paymentStats = await Orders.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$total" }
      }
    }
  ]);

  res.status(200).json(
    new Apiresponse(200, {
      overview: analytics[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      statusBreakdown: statusStats,
      paymentBreakdown: paymentStats
    }, "Analytics fetched successfully")
  );
});

export {
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
};
