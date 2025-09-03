import mongoose, { Schema, model } from "mongoose";

const ServiceProviderSchema = new Schema(
  {
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    username: {
      type: String,
      required: true,
    },
    CNIC: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profilePic: {
      type: String,
      // required: true,
    },
    shopAddress: {
      type: String,
      required: true,
    },
    servicesOffered: [
      {
        type: Schema.Types.ObjectId,
        ref: "Services",
        required: true,
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    phoneNo: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
ServiceProviderSchema.index({ location: "2dsphere" }); 

export const ServiceProviders = mongoose.model(
  "ServiceProviders",
  ServiceProviderSchema
);
