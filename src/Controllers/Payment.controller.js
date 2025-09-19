import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Payments } from "../models/Payments.model.js";
import { AdminPayments } from "../models/AdminPayments.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Orders } from "../models/Orders.js";
import { Users } from "../models/Users.model.js";
import mongoose from "mongoose";

// Provider Payment Management

// Get provider's payment method details
export const getProviderPaymentMethod = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;
    
    const provider = await ServiceProviders.findById(providerId)
      .select('paymentMethod paymentDetails username email');
    
    if (!provider) {
      throw new Apierror(404, "Provider not found");
    }

        res.status(200).json(
            new Apiresponse(200, {
        paymentMethod: provider.paymentMethod,
        paymentDetails: provider.paymentDetails,
        username: provider.username,
        email: provider.email
      }, "Payment method retrieved successfully")
        );
    } catch (error) {
("Error getting provider payment method:", error);
    throw new Apierror(500, "Failed to retrieve payment method");
  }
});

// Update provider's payment method
export const updateProviderPaymentMethod = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;
    const { paymentMethod, paymentDetails } = req.body;

("🔍 Updating payment method for provider:", providerId);
("🔍 Received paymentMethod:", paymentMethod);
("🔍 Received paymentDetails:", paymentDetails);

    if (!paymentMethod) {
      throw new Apierror(400, "Payment method is required");
    }

    const validMethods = ["easypaisa", "jazzcash", "bank_transfer"];
    if (!validMethods.includes(paymentMethod)) {
      throw new Apierror(400, "Invalid payment method");
    }

    const provider = await ServiceProviders.findByIdAndUpdate(
      providerId,
      { 
        paymentMethod,
        paymentDetails: paymentDetails || {}
      },
      { new: true, runValidators: true }
    ).select('paymentMethod paymentDetails username email');

    if (!provider) {
      throw new Apierror(404, "Provider not found");
    }

("✅ Updated provider payment method:", provider.paymentMethod);
("✅ Updated provider payment details:", provider.paymentDetails);

        res.status(200).json(
            new Apiresponse(200, {
        paymentMethod: provider.paymentMethod,
        paymentDetails: provider.paymentDetails,
        username: provider.username,
        email: provider.email
      }, "Payment method updated successfully")
        );
    } catch (error) {
("Error updating provider payment method:", error);
    throw new Apierror(500, "Failed to update payment method");
  }
});

// Get provider's payment history
export const getProviderPaymentHistory = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payments.find({ providerId })
      .populate('orderId', 'orderTrackingId totalPayment status')
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPayments = await Payments.countDocuments({ providerId });
    const totalAmount = await Payments.aggregate([
      { $match: { providerId: new mongoose.Types.ObjectId(providerId), status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const pendingAmount = await Payments.aggregate([
      { $match: { providerId: new mongoose.Types.ObjectId(providerId), status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.status(200).json(
      new Apiresponse(200, {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNext: page < Math.ceil(totalPayments / limit),
          hasPrev: page > 1
        },
        summary: {
          totalEarned: totalAmount[0]?.total || 0,
          pendingAmount: pendingAmount[0]?.total || 0
        }
      }, "Payment history retrieved successfully")
    );
  } catch (error) {
("Error getting provider payment history:", error);
    throw new Apierror(500, "Failed to retrieve payment history");
  }
});

// Admin Payment Management

// Get all providers with their payment summaries
export const getAllProvidersPaymentSummary = asynchandler(async (req, res) => {
  try {
    const providers = await ServiceProviders.find({ approvalFromAdmin: true })
      .select('username email phoneNo paymentMethod paymentDetails');

    const providersWithPayments = await Promise.all(
      providers.map(async (provider) => {
        const totalEarned = await Payments.aggregate([
          { $match: { providerId: provider._id, status: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const pendingAmount = await Payments.aggregate([
          { $match: { providerId: provider._id, status: "pending" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalPaidByAdmin = await AdminPayments.aggregate([
          { $match: { providerId: provider._id, status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        return {
          _id: provider._id,
          username: provider.username,
          email: provider.email,
          phoneNo: provider.phoneNo,
          paymentMethod: provider.paymentMethod,
          paymentDetails: provider.paymentDetails,
          totalEarned: totalEarned[0]?.total || 0,
          pendingAmount: pendingAmount[0]?.total || 0,
          totalPaidByAdmin: totalPaidByAdmin[0]?.total || 0,
          balance: pendingAmount[0]?.total || 0  // Balance should be pendingAmount only
        };
      })
    );

        res.status(200).json(
      new Apiresponse(200, providersWithPayments, "Providers payment summary retrieved successfully")
        );
    } catch (error) {
("Error getting providers payment summary:", error);
    throw new Apierror(500, "Failed to retrieve providers payment summary");
  }
});

// Make payment to provider (Admin function)
export const makePaymentToProvider = asynchandler(async (req, res) => {
  try {
("🔍 Starting payment process...");
    const adminId = req.id;
    const { providerId, amount, paymentMethod, paymentDetails, notes } = req.body;

("🔍 Payment request data:", { adminId, providerId, amount, paymentMethod, paymentDetails, notes });

    if (!providerId || !amount || !paymentMethod) {
      throw new Apierror(400, "Provider ID, amount, and payment method are required");
    }

    if (amount <= 0) {
      throw new Apierror(400, "Amount must be greater than 0");
    }

    const provider = await ServiceProviders.findById(providerId);
    if (!provider) {
      throw new Apierror(404, "Provider not found");
    }

    // Check if provider has payment method configured
    if (!provider.paymentMethod || !provider.paymentDetails) {
      throw new Apierror(400, "Provider has not configured their payment method. Please ask the provider to add their payment details first.");
    }

    // Validate payment details based on payment method
    const { paymentMethod: providerPaymentMethod, paymentDetails: providerPaymentDetails } = provider;
    if (providerPaymentMethod === "easypaisa" || providerPaymentMethod === "jazzcash") {
      if (!providerPaymentDetails.accountNumber || !providerPaymentDetails.accountTitle) {
        throw new Apierror(400, "Provider's mobile payment details are incomplete. Please ask the provider to complete their payment setup.");
      }
    } else if (providerPaymentMethod === "bank_transfer") {
      if (!providerPaymentDetails.accountNumber || !providerPaymentDetails.accountTitle || !providerPaymentDetails.bankName) {
        throw new Apierror(400, "Provider's bank transfer details are incomplete. Please ask the provider to complete their payment setup.");
      }
    }

("🔍 Provider found:", provider.username);
("🔍 Provider payment method:", provider.paymentMethod);

    // Create admin payment record
("🔍 Creating admin payment record...");
    const adminPayment = await AdminPayments.create({
      providerId,
      amount,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      notes,
      adminId,
      status: "completed",
      paidAt: new Date()
    });
("✅ Admin payment record created:", adminPayment._id);

    // Update pending payments up to the amount being paid
("🔍 Finding pending payments for provider:", providerId);
    const pendingPayments = await Payments.find({ 
      providerId, 
      status: "pending" 
    }).sort({ createdAt: 1 }); // Oldest first

("🔍 Found pending payments:", pendingPayments.length);
("🔍 Pending payments details:", pendingPayments.map(p => ({ id: p._id, amount: p.amount, status: p.status })));

    let remainingAmount = amount;
    const updatedPaymentIds = [];

    for (const payment of pendingPayments) {
      if (remainingAmount <= 0) break;
      
("🔍 Processing payment:", payment._id, "Amount:", payment.amount, "Remaining:", remainingAmount);
      
      const paymentAmount = Math.min(payment.amount, remainingAmount);
      
      // If this payment is partially paid, we need to create a new payment record
      if (paymentAmount < payment.amount) {
("🔍 Creating partial payment record for remaining amount:", payment.amount - paymentAmount);
        // Create a new payment record for the remaining amount
        await Payments.create({
          orderId: payment.orderId,
          providerId: payment.providerId,
          userId: payment.userId,
          amount: payment.amount - paymentAmount,
          status: "pending",
          paymentMethod: payment.paymentMethod,
          paymentDetails: payment.paymentDetails,
          createdAt: payment.createdAt
        });
      }
      
      // Update the current payment
("🔍 Updating payment:", payment._id, "to amount:", paymentAmount);
      await Payments.findByIdAndUpdate(payment._id, {
        amount: paymentAmount,
        status: "paid",
        paidAt: new Date(),
        adminPaymentId: adminPayment._id
      });
      
      updatedPaymentIds.push(payment._id);
      remainingAmount -= paymentAmount;
    }

("✅ Payment processing completed. Updated payments:", updatedPaymentIds.length);

    // Send email notification to provider
    try {
      const { sendEmail } = await import("../utils/Nodemailer.js");
      await sendEmail(
        provider.email,
        `Payment Received - Amount: PKR ${amount}`,
        `Hello ${provider.username},\n\nYou have received a payment of PKR ${amount}.\n\nPayment Method: ${paymentMethod}\nAmount: PKR ${amount}\nDate: ${new Date().toLocaleDateString()}\n\nThank you for your service!\n\nTeam Tailorwash`
      );
("✅ Payment notification email sent to provider");
    } catch (emailErr) {
("⚠️ Failed to send payment notification email:", emailErr.message);
    }

    res.status(201).json(
      new Apiresponse(201, adminPayment, "Payment made successfully")
    );
  } catch (error) {
("❌ Error making payment to provider:", error);
("❌ Error message:", error.message);
("❌ Error stack:", error.stack);
    if (error.name === 'ValidationError') {
("❌ Validation errors:", error.errors);
    }
    throw new Apierror(500, `Failed to make payment: ${error.message}`);
  }
});

// Get admin payment history
export const getAdminPaymentHistory = asynchandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const payments = await AdminPayments.find()
      .populate('providerId', 'username email')
      .populate('adminId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPayments = await AdminPayments.countDocuments();
    const totalAmount = await AdminPayments.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.status(200).json(
      new Apiresponse(200, {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNext: page < Math.ceil(totalPayments / limit),
          hasPrev: page > 1
        },
        summary: {
          totalPaid: totalAmount[0]?.total || 0
        }
      }, "Admin payment history retrieved successfully")
    );
  } catch (error) {
("Error getting admin payment history:", error);
    throw new Apierror(500, "Failed to retrieve admin payment history");
  }
});

// Get provider's admin payment history (payments received from admin)
export const getProviderAdminPaymentHistory = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await AdminPayments.find({ providerId })
      .populate('adminId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalPayments = await AdminPayments.countDocuments({ providerId });
    const totalAmount = await AdminPayments.aggregate([
      { $match: { providerId: new mongoose.Types.ObjectId(providerId), status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.status(200).json(
      new Apiresponse(200, {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNext: page < Math.ceil(totalPayments / limit),
          hasPrev: page > 1
        },
        summary: {
          totalReceivedFromAdmin: totalAmount[0]?.total || 0
        }
      }, "Provider admin payment history retrieved successfully")
    );
  } catch (error) {
("Error getting provider admin payment history:", error);
    throw new Apierror(500, "Failed to retrieve admin payment history");
  }
});

// Update order creation to track payments (will be called from Orders controller)
export const createPaymentRecord = async (orderData) => {
  try {
    const { orderId, providerId, userId, amount } = orderData;

("🔍 Creating payment record with data:", {
      providerId,
      orderId,
      userId,
      amount,
      paymentType: "order_payment",
      status: "pending",
      paymentMethod: "stripe"
    });

    const payment = await Payments.create({
      providerId,
      orderId,
      userId,
      amount,
      paymentType: "order_payment",
      status: "pending",
      paymentMethod: "stripe" // Default for order payments
    });

("✅ Payment record created:", payment._id);
    return payment;
  } catch (error) {
("❌ Error creating payment record:", error);
("❌ Error details:", error.message);
("❌ Error stack:", error.stack);
    throw error;
  }
};