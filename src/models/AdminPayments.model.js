import mongoose from "mongoose";

const AdminPaymentSchema = new mongoose.Schema(
  {
    providerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ServiceProviders", 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    paymentMethod: {
      type: String,
      enum: ["easypaisa", "jazzcash", "bank_transfer"],
      required: true
    },
    paymentDetails: {
      accountTitle: String,
      accountNumber: String,
      bankName: String
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending"
    },
    notes: String,
    paidAt: Date,
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Index for efficient queries
AdminPaymentSchema.index({ providerId: 1, createdAt: -1 });
AdminPaymentSchema.index({ status: 1 });
AdminPaymentSchema.index({ adminId: 1 });

export const AdminPayments = mongoose.model("AdminPayments", AdminPaymentSchema);
