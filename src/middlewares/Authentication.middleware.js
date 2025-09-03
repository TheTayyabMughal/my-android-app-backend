import { Apierror } from "../utils/Apierror.js";
import { asynchandler } from "../utils/Asynchandler.js";
import jwt from "jsonwebtoken";
import { Users } from "../models/Users.model.js";


const verifyJWT = asynchandler(async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;
    if (!token) {
      throw new Apierror(401, "Unauthorized request");
    }

    const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await Users.findById(decodedtoken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new Apierror(401, "Invalid Access Token");
    }

    req.user = user;
    
    next();
  } catch (error) {
    throw new Apierror(401, error?.message || "Invalid accessToken");
  }
});

const verifyAdmin=asynchandler(async(req,res,next)=>{
  if(req.user && req.user.role==="admin"){
    next();
  }
  else{
    throw new Apierror(401,"You are not logged in login first")
  }
})

const verifyProvider=asynchandler(async(req,res,next)=>{
  if(req.user && req.user.role==="serviceProvider"){
    next();
  }
  else{
    throw new Apierror(401,"You are not logged in login first")
  }
})
const verifyProviderOrAdmin=asynchandler(async(req,res,next)=>{
  if(req.user.role==="admin" || req.user.role==="serviceProvider"){
    next();
  }
  else{
    throw new Apierror(401,"You are not logged in login as Service Provider or Admin first")
  }
})

const verifyCustomer=asynchandler(async(req,res,next)=>{
  const id=req.user._id;
  if(req.user && req.user.role==="customer"){
    const sellerinfo=await Sellers.findOne({User:id});
    if(!sellerinfo){
      throw new Apierror(400,"User not found");
    }
    req.seller=sellerinfo;
    next();
  }
  else{
    throw new Apierror(401,"You are not logged in login as seller first")
  }
})

const verifyAdminorCustomer=asynchandler(async(req,res,next)=>{
  if(req.user.role==="admin" || req.user.role==="serviceProvider"){
    next();
  }
  else{
    throw new Apierror(401,"You are not logged in login as Service Provider or Admin first")
  }
})

export {verifyJWT,verifyAdmin,verifyCustomer,verifyAdminorCustomer,verifyProvider,verifyProviderOrAdmin}