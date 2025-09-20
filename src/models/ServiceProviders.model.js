import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import { type } from "os";
import bcrypt from "bcryptjs";

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
    resetPasswordOtp: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
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
    },
    paymentMethod: {
      type: String,
      enum: ["easypaisa", "jazzcash", "bank_transfer"],
      default: "easypaisa"
    },
    paymentDetails: {
      accountTitle: String,
      accountNumber: String,
      bankName: String
    }
  },
  { timestamps: true }
);

// Hash password before saving
ServiceProviderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
ServiceProviderSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

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

// Add 2dsphere index for geospatial queries
ServiceProviderSchema.index({ currentLocation: "2dsphere" });

export const ServiceProviders = mongoose.model(
  "ServiceProviders",
  ServiceProviderSchema
);
