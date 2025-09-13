import mongoose, { Schema, model } from "mongoose";

const OfferSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    serviceProvider: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProviders",
      required: true,
    },
    servicesIncluded: [
      {
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Offers = mongoose.model("Offers", OfferSchema);
