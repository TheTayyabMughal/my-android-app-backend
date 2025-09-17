import { Apierror } from "../utils/Apierror.js";
import { asynchandler } from "../utils/Asynchandler.js";
import jwt from "jsonwebtoken";
import { Users } from "../models/Users.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";


const verifyJWT = asynchandler(async (req, res, next) => {
  // 🔹 Get token from cookie or Authorization header
  const cookieToken = req.cookies?.accessToken;
  const headerToken = req.header("Authorization")?.replace("Bearer ", "");

  const token = cookieToken || headerToken;

  if (!token) {
    throw new Apierror(401, "❌ Unauthorized: No token provided");
  }

  // 🔹 Verify JWT token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    throw new Apierror(401, "❌ Invalid or expired token");
  }

  // 🔹 Check user role and find user in DB
  let user;
  if (decoded.role === "Admin") {
    req.id = "Admin";
    return next();
  } else if (decoded.role === "provider") {
    user = await ServiceProviders.findById(decoded._id).select("-password -refreshToken");
    console.log("Found Provider:", user);
  } else {
    user = await Users.findById(decoded._id).select("-password -refreshToken");
    console.log("Found User:", user);
  }

  if (decoded.role !== "Admin" && !user) {
    throw new Apierror(401, "❌ Unauthorized: Invalid token (user not found)");
  }

  req.id = decoded._id;
  next();
});

const verifyAdmin = asynchandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  }
  else {
    throw new Apierror(401, "You are not logged in login first")
  }
})

const verifyProvider = asynchandler(async (req, res, next) => {
  if (req.user && req.user.role === "serviceProvider") {
    next();
  }
  else {
    throw new Apierror(401, "You are not logged in login first")
  }
})
const verifyProviderOrAdmin = asynchandler(async (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "serviceProvider") {
    next();
  }
  else {
    throw new Apierror(401, "You are not logged in login as Service Provider or Admin first")
  }
})

const verifyCustomer = asynchandler(async (req, res, next) => {
  const id = req.user._id;
  if (req.user && req.user.role === "customer") {
    const sellerinfo = await Sellers.findOne({ User: id });
    if (!sellerinfo) {
      throw new Apierror(400, "User not found");
    }
    req.seller = sellerinfo;
    next();
  }
  else {
    throw new Apierror(401, "You are not logged in login as seller first")
  }
})

const verifyAdminorCustomer = asynchandler(async (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "serviceProvider") {
    next();
  }
  else {
    throw new Apierror(401, "You are not logged in login as Service Provider or Admin first")
  }
})

export { verifyJWT, verifyAdmin, verifyCustomer, verifyAdminorCustomer, verifyProvider, verifyProviderOrAdmin }