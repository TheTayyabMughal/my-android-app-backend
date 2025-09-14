import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProviders", required: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offers", required: true },
    services: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalPayment: { type: Number, required: true },
    address: {
      homeAddress: { type: String, required: true },
      phoneNo: { type: String, required: true },
      email: { type: String, required: true },
    },
    paymentIntentId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "ready for Pickup", "out for Delivery", "delivered", "cancelled"],
      default: "pending",
    },
    orderTrackingId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Orders = mongoose.model("Order", OrderSchema);
