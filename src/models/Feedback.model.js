import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders",
      required: true,
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProviders",
    },
  },
  { timestamps: true }
);

// Ensure one feedback per user per order
feedbackSchema.index({ givenBy: 1, order: 1 }, { unique: true });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
