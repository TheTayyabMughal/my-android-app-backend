import { Apierror } from "../utils/Apierror.js";
import { asynchandler } from "../utils/Asynchandler.js";
import jwt from "jsonwebtoken";
import { Users } from "../models/Users.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";


const verifyJWT = asynchandler(async (req, res, next) => {
  try {
    // 🔹 Get token from cookie or Authorization header
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ message: "❌ Unauthorized: No token provided" });
    }

    // 🔹 Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ message: "❌ Invalid or expired token" });
    }

    // 🔹 Check user role and find user in DB
    let user;
    if (decoded.role === "Admin") {
      req.id = "Admin";
      next();
    } else if (decoded.role === "provider") {
      user = await ServiceProviders.findById(decoded._id).select("-password -refreshToken");
      console.log("Found Provider:", user);
    } else {
      user = await Users.findById(decoded._id).select("-password -refreshToken");
      console.log("Found User:", user);
    }

    if (decoded.role !== "Admin" && !user) {
      return res.status(401).json({ message: "❌ Unauthorized: Invalid token (user not found)" });
    }

    req.id = decoded._id;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error in JWT Middleware" });
  }
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