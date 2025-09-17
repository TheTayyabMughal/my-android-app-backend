import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
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
    role: {
      type: String,
      enum: ["admin", "customer", "serviceProvider"],
      default: "customer",
    },
    // profilePic: {
    //   type: String,
    //   // required: true,
    // },
    refreshToken: {
      type: String,
    },
    registrationOtp: { type: String },
    registrationOtpExpiry: { type: Date },
    otp: { type: String },
    otpExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    measurements: [
      {
        serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceProviders", required: true },
        chest: { type: Number, default: null },
        waist: { type: Number, default: null },
        hips: { type: Number, default: null },
        shoulder: { type: Number, default: null },
        sleeveLength: { type: Number, default: null },
        shirtLength: { type: Number, default: null },
        trouserLength: { type: Number, default: null },
        inseam: { type: Number, default: null },
        neck: { type: Number, default: null },
        notes: { type: String }
      }
    ],
  },
  { timestamps: true }
);



UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};




UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this._email,
      username: this._username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const Users = mongoose.model("Users", UserSchema);
