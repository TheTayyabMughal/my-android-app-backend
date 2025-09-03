import mongoose, { Schema, model } from "mongoose";

const ApplicationSchema = new Schema(
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
      unique: true,
    },
    CNIC: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
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
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    phoneNo: {
      type: String,
      required: true,
    },
    otp: { type: String },
    otpExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Applications = mongoose.model("Applications", ApplicationSchema);
