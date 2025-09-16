import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import { type } from "os";

const ServiceProviderSchema = new Schema(
  {
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    otp: { type: String },
    otpExpiry: { type: Date },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
    },
    shopAddress: {
      type: String,
      required: true,
    },
    servicesOffered: [
      { type: Schema.Types.ObjectId, ref: "Services", required: true }
    ],
    profileStatus: {
      type: Boolean,
      default: true
    },
    approvalFromAdmin: {
      type: Boolean,
      default: false
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
    },
    phoneNo: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// ✅ Add JWT methods on ServiceProviderSchema instead of UserSchema
ServiceProviderSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: "provider", // ✅ role add karna acha hoga
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};


ServiceProviderSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      role: "provider",
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const ServiceProviders = mongoose.model(
  "ServiceProviders",
  ServiceProviderSchema
);
