import mongoose, { Schema, model } from "mongoose";

const OfferSchema = new Schema(
  {
    price:{
      type: Number,
      required: true,
    },
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
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    serviceProvider: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProviders",
      required: true,
    },
    servicesIncluded: [
      {
        type: Schema.Types.ObjectId,
        ref: "Services",
        required: true,
      }
    ],
    termsAndConditions: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Offers = mongoose.model("Offers", OfferSchema);
