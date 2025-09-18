import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    providerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ServiceProviders", 
      required: true 
    },
    orderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Order", 
      required: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Users", 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    paymentType: {
      type: String,
      enum: ["order_payment", "admin_payment"],
      default: "order_payment"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["easypaisa", "jazzcash", "bank_transfer", "stripe"],
      required: true
    },
    paymentDetails: {
      accountTitle: String,
      accountNumber: String,
      bankName: String
    },
    adminPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminPayments"
    },
    notes: String,
    paidAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for efficient queries
PaymentSchema.index({ providerId: 1, createdAt: -1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });

export const Payments = mongoose.model("Payments", PaymentSchema);
