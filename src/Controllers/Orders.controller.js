import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Orders } from "../models/Orders.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Riders } from "../models/Rider.model.js";
import { Users } from "../models/Users.model.js";
import { Measurements } from "../models/Measurements.model.js";
import { createPaymentRecord } from "./Payment.controller.js";
import Stripe from 'stripe';
import mongoose from "mongoose";
import nodemailer from "nodemailer";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key');

// Check if Stripe key is properly configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("WARNING: STRIPE_SECRET_KEY environment variable is not set. Using test mode. Payments won't be processed in production.");
}

const createPaymentIntent = asynchandler(async (req, res) => {
  const { amount, currency } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
})

const sendEmailwithHTML = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
        pass: process.env.EMAIL_PASS || "fpxq drqb sknd uyog"
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Tailorwash" <${process.env.EMAIL_USER || "adnanamin.online@gmail.com"}>`,
      to,
      subject,
      html, // Using HTML for professional email
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    throw error;
  }
};




// Create order with Stripe payment
const createOrder = asynchandler(async (req, res) => {
  const userId = req.id;
  const { serviceProviderId, offerId, services, totalPayment, address, paymentIntentId } = req.body;

  try {
    // Generate unique tracking ID
    const orderTrackingId = await generateUniqueOrderId();

    const newOrder = new Orders({
      userId,
      serviceProviderId,
      offerId,
      services,
      totalPayment,
      address,
      paymentIntentId,
      status: "pending",
      orderTrackingId,
    });

    const savedOrder = await newOrder.save();

    // ✅ Create payment record for provider
    try {
      await createPaymentRecord({
        orderId: savedOrder._id,
        providerId: savedOrder.serviceProviderId,
        userId: savedOrder.userId,
        amount: savedOrder.totalPayment
      });
      console.log("✅ Payment record created for order:", savedOrder.orderTrackingId);
    } catch (paymentErr) {
      console.error("⚠️ Failed to create payment record:", paymentErr.message);
      // Don't throw error here - order should still be created even if payment record fails
    }

    // ✅ Send confirmation email to user after saving
    try {
      await sendEmailwithHTML(
        savedOrder.address.email,
        `Order Confirmation - Tracking ID: ${savedOrder.orderTrackingId}`,
        `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">Order Confirmed ✅</h2>
          <p>Hi,</p>
          <p>Thank you for placing your order with <strong>Tailorwash</strong>! Here are your order details:</p>
          <p><strong>Tracking ID:</strong> ${savedOrder.orderTrackingId}</p>
          <p><strong>Total Payment:</strong> $${savedOrder.totalPayment}</p>
          <h3>Ordered Services:</h3>
          <ul>
            ${savedOrder.services
              .map(
                (service) =>
                  `<li>${service.name} - Qty: ${service.quantity} - $${service.price}</li>`
              )
              .join("")}
          </ul>
          <p>We will notify you as soon as the status of your order changes.</p>
          <p style="margin-top: 20px;">Thanks,<br/>Team Tailorwash</p>
        </div>
        `
      );
    } catch (emailErr) {
      console.error("⚠️ Failed to send order confirmation email:", emailErr.message);
    }

    // ✅ Send notification email to service provider
    try {
      // Get service provider details
      const serviceProvider = await ServiceProviders.findById(savedOrder.serviceProviderId).select('email username');
      
      if (serviceProvider && serviceProvider.email) {
        await sendEmailwithHTML(
          serviceProvider.email,
          `New Order Received - Tracking ID: ${savedOrder.orderTrackingId}`,
          `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2196F3;">New Order Received 📦</h2>
            <p>Hello <strong>${serviceProvider.username}</strong>,</p>
            <p>You have received a new order! Here are the details:</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="color: #333; margin-top: 0;">Order Details</h3>
              <p><strong>Tracking ID:</strong> ${savedOrder.orderTrackingId}</p>
              <p><strong>Total Payment:</strong> $${savedOrder.totalPayment}</p>
              <p><strong>Status:</strong> Pending</p>
            </div>

            <h3>Customer Information:</h3>
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Name:</strong> ${savedOrder.address.fullName}</p>
              <p><strong>Email:</strong> ${savedOrder.address.email}</p>
              <p><strong>Phone:</strong> ${savedOrder.address.phoneNo}</p>
              <p><strong>Address:</strong> ${savedOrder.address.homeAddress}</p>
            </div>

            <h3>Ordered Services:</h3>
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <ul style="margin: 0; padding-left: 20px;">
                ${savedOrder.services
                  .map(
                    (service) =>
                      `<li><strong>${service.name}</strong> - Quantity: ${service.quantity} - Price: $${service.price}</li>`
                  )
                  .join("")}
              </ul>
            </div>

            <p style="margin-top: 20px;"><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the order details</li>
              <li>Contact the customer if needed</li>
              <li>Update order status in your dashboard</li>
              <li>Add measurements if required</li>
            </ul>

            <p style="margin-top: 20px;">Please log in to your provider dashboard to manage this order.</p>
            <p style="margin-top: 20px;">Thanks,<br/>Team Tailorwash</p>
          </div>
          `
        );
        console.log("✅ Provider notification email sent successfully");
      }
    } catch (providerEmailErr) {
      console.error("⚠️ Failed to send provider notification email:", providerEmailErr.message);
    }

    return res.status(201).json({
      success: true,
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.message,
    });
  }
});


const generateUniqueOrderId = async () => {
  let unique = false;
  let orderId;

  while (!unique) {
    orderId = Math.floor(10000 + Math.random() * 90000); // 5-digit number
    const exists = await Orders.findOne({ orderTrackingId: orderId });
    if (!exists) unique = true;
  }

  return orderId.toString();
};


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
  const userId = req.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Apierror(400, "Invalid User ID");
  }

  const orders = await Orders.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    // Lookup service provider to get username
    {
      $lookup: {
        from: "serviceproviders", // MongoDB collection name
        localField: "serviceProviderId",
        foreignField: "_id",
        as: "serviceProvider",
      },
    },
    // Unwind array from lookup
    { $unwind: "$serviceProvider" },
    // Project only required fields
    {
      $project: {
        _id: 1,
        orderTrackingId: 1,
        services: 1,
        totalPayment: 1,
        address: 1,
        status: 1,
        isFeedBackGiven:1,
        createdAt: 1,
        measurementAdded:1,
        "serviceProvider.username": 1,
        "serviceProvider._id":1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
  res.status(200).json(new Apiresponse(200, orders, "User orders fetched successfully"));

});

// Get orders for service provider
const getProviderOrders = asynchandler(async (req, res) => {
  const userId = req.id;
  try {
    const orders = await Orders.aggregate([
      {
        $match: {
          serviceProviderId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          "user.measurements": {
            $filter: {
              input: "$user.measurements",
              as: "measurement",
              cond: { $eq: ["$$measurement.serviceProviderId", new mongoose.Types.ObjectId(userId)] },
            },
          },
        },
      },

      // Join feedback only for orders with isFeedBackGiven = true
      {
        $lookup: {
          from: "feedbacks",
          let: { orderId: "$_id", feedbackFlag: "$isFeedBackGiven" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$order", "$$orderId"] },
                    { $eq: ["$$feedbackFlag", true] },
                  ],
                },
              },
            },
            {
              $project: {
                rating: 1,
                comment: 1,
                givenBy: 1,
                createdAt: 1,
              },
            },
          ],
          as: "feedback",
        },
      },

      {
        $project: {
          services: 1,
          totalPayment: 1,
          address: 1,
          status: 1,
          userId: 1,
          orderTrackingId: 1,
          isFeedBackGiven: 1,
          "user.username": 1,
          "user.measurements": 1, // ✅ Only filtered measurements will be returned
          feedback: 1,
        },
      },
    ]);

    console.log("Data: ", JSON.stringify(orders, null, 2));

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching provider orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
});

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
        pass: process.env.EMAIL_PASS || "fpxq drqb sknd uyog"
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Tailorwash" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    throw error;
  }
};
// Update order status
const updateOrderStatus = asynchandler(async (req, res) => {
  const { orderTrackingId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "processing",
    "ready for Pickup",
    "out for Delivery",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Valid options: ${validStatuses.join(", ")}`,
    });
  }

  try {
    // Find and update order
    const updatedOrder = await Orders.findOneAndUpdate(
      { orderTrackingId },
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Send email notification to user
    try {
      await sendEmail(
        updatedOrder.address.email,
        `Order Status Update: ${updatedOrder.orderTrackingId}`,
        `Hello,\n\nYour order with Tracking ID ${updatedOrder.orderTrackingId} is now "${status}".\n\nThank you for using Tailorwash!`
      );
    } catch (emailErr) {
      console.error("⚠️ Failed to send order status email to user:", emailErr.message);
    }

    // Send email notification to service provider
    try {
      const serviceProvider = await ServiceProviders.findById(updatedOrder.serviceProviderId).select('email username');
      
      if (serviceProvider && serviceProvider.email) {
        await sendEmail(
          serviceProvider.email,
          `Order Status Updated: ${updatedOrder.orderTrackingId}`,
          `Hello ${serviceProvider.username},\n\nYou have updated the status of order ${updatedOrder.orderTrackingId} to "${status}".\n\nCustomer: ${updatedOrder.address.fullName}\nEmail: ${updatedOrder.address.email}\nPhone: ${updatedOrder.address.phoneNo}\n\nKeep up the great work!\n\nTeam Tailorwash`
        );
        console.log("✅ Provider status update notification sent");
      }
    } catch (providerEmailErr) {
      console.error("⚠️ Failed to send status update email to provider:", providerEmailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Order status updated and email sent (if possible)",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
});


const addMeasurements = asynchandler(async (req, res) => {
  const { orderTrackingId } = req.params;
  const { measurements } = req.body;
  const serviceProviderId = req.id; // ensure ye ObjectId ho

  if (!mongoose.Types.ObjectId.isValid(serviceProviderId)) {
    throw new Apierror(400, "Invalid Service Provider ID");
  }

  // Find the order
  const order = await Orders.findOne({ orderTrackingId });
  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  // Find the user
  const user = await Users.findById(order.userId);
  if (!user) {
    throw new Apierror(404, "User not found");
  }

  // Initialize measurements array if not present
  if (!Array.isArray(user.measurements)) {
    user.measurements = [];
  }

  // Check if measurement already exists for this service provider
  const existingIndex = user.measurements.findIndex(
    (m) => m.serviceProviderId.toString() === serviceProviderId
  );

  if (existingIndex >= 0) {
    // Update existing measurement
    user.measurements[existingIndex] = {
      ...user.measurements[existingIndex],
      ...measurements,
      serviceProviderId,
    };
  } else {
    // Add new measurement
    user.measurements.push({
      serviceProviderId,
      ...measurements,
    });
  }

  await user.save();

  // Send email notification to user about measurements
  try {
    const serviceProvider = await ServiceProviders.findById(serviceProviderId).select('username');
    const action = existingIndex >= 0 ? "updated" : "added";
    
    await sendEmail(
      order.address.email,
      `Measurements ${action} for Order: ${orderTrackingId}`,
      `Hello ${order.address.fullName},\n\nYour measurements have been ${action} for order ${orderTrackingId} by ${serviceProvider?.username || 'your service provider'}.\n\nOrder Details:\n- Tracking ID: ${orderTrackingId}\n- Service Provider: ${serviceProvider?.username || 'N/A'}\n- Status: Measurements ${action}\n\nYou can view your measurements in your account dashboard.\n\nThank you for using Tailorwash!\n\nTeam Tailorwash`
    );
    console.log("✅ User measurement notification sent");
  } catch (emailErr) {
    console.error("⚠️ Failed to send measurement notification to user:", emailErr.message);
  }

  res.status(200).json(
    new Apiresponse(200, user.measurements, "Measurements added/updated successfully")
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

const getOrderById = asynchandler(async (req, res) => {
  const { id } = req.params;

  const order = await Orders.findById(id)
    .populate('user', 'username email')
    .populate('serviceProviderId', 'name contactInfo')
    .populate('offerId', 'title discount')
    .populate('services')
    .populate('rider', 'name phoneNo')
    .populate('statusHistory.updatedBy', 'username email');

  if (!order) {
    throw new Apierror(404, "Order not found");
  }

  res.status(200).json(
    new Apiresponse(200, order, "Order details fetched successfully")
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
  getOrderAnalytics,
  addMeasurements,
  createPaymentIntent
};
