import { uploadonCloudinary } from "../utils/Fileupload.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Users } from "../models/Users.model.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user:"thetmughal@gmail.com",
    pass:"gikz szmb wekn fmov"
  },
});

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await Users.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Apierror(500, "Error generating access and refresh tokens");
  }
};



// const registerUser = asynchandler(async (req, res) => {
//   const { username, email, password, role="customer" } = req.body;

//   if (!username || !email || !password) {
//     return res.status(400).json(new Apiresponse(400, null, "All fields are required"));
//   }

//   const existingUser = await Users.findOne({ $or: [{ username }, { email }] });
//   if (existingUser) {
//     return res.status(400).json(new Apiresponse(400, null, "User already exists"));
//   }

//   // console.log("Files received:", req.files);
//   // const profilePicFile = req.files?.profilePic;



//   // let ProfilePic;
//   // try {
//   //   if (Array.isArray(profilePicFile)) {
//   //     ProfilePic = await uploadonCloudinary(profilePicFile[0].path);
//   //   } else {
//   //     ProfilePic = await uploadonCloudinary(profilePicFile.path);
//   //   }

//   //   if (!ProfilePic?.url) {
//   //     return res.status(400).json(new Apiresponse(400, null, "Error uploading profile picture"));
//   //   }
//   // } catch (uploadError) {
//   //   console.error("Upload error:", uploadError);
//   //   return res.status(500).json(new Apiresponse(500, null, "Error processing profile picture"));
//   // }

//   // Profile picture upload logic (if needed)
//   // if (!profilePicPath) {
//   //   return res.status(400).json(new Apiresponse(400, null, "Profile picture is required"));
//   // }
//   // if (profilePicPath.path) {
//   //   var ProfilePic = await uploadonCloudinary(profilePicPath);
//   // }
//   // if (!ProfilePic) {
//   //   return res.status(400).json(new Apiresponse(400, null, "Error uploading profile picture"));
//   // }

//   try {
//     const user = await Users.create({
//       username: username.toLowerCase(),
//       password: password,
//       email,
//       role,
//       // profilePic: ProfilePic.url,
//       profilePic: " ",
//     });

//     const createdUser = await Users.findById(user._id).select("-password");
//     if (!createdUser) {
//       return res.status(500).json(new Apiresponse(500, null, "Error registering user"));
//     }

//     return res.status(201).json(new Apiresponse(201, createdUser, "User Registered Successfully"));
//   } catch (error) {
//     return res.status(500).json(new Apiresponse(500, null, "Internal Server Error"));
//   }
// });





const testSendMail = async () => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "abdullah03350904415@gmail.com",
      subject: "Test Email",
      html: "<p>This is a test email sent from your server.</p>",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Test email sent successfully:", info.response);
  } catch (error) {
    console.error("Error sending test email:", error);
  }
};



const registerUser = asynchandler(async (req, res) => {
  const { username, email, password, role = "customer" } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json(new Apiresponse(400, null, "All fields are required"));
  }

  const existingUser = await Users.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    return res.status(400).json(new Apiresponse(400, null, "User already exists"));
  }

  const otp = ("" + Math.floor(1000 + Math.random() * 9000));
  const otpExpiry = Date.now() + 5 * 60 * 1000; 

  const user = await Users.create({
    username: username.toLowerCase(),
    password,
    email,
    role,
    profilePic: " ",
    registrationOtp: otp,
    registrationOtpExpiry: otpExpiry,
    isVerified: false,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Registration",
    html: `<p>Your OTP is: <b>${otp}</b></p>`,
  };
  await transporter.sendMail(mailOptions);

  return res.status(201).json(new Apiresponse(201, { email }, "OTP sent to your email. Please verify to complete registration."));
});

const verifyRegistrationOtp = asynchandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json(new Apiresponse(400, null, "Email and OTP are required"));
  }

  const user = await Users.findOne({ email });
  if (!user) {
    return res.status(404).json(new Apiresponse(404, null, "User not found"));
  }
  if (user.isVerified) {
    return res.status(400).json(new Apiresponse(400, null, "User already verified"));
  }
  if (
    user.registrationOtp !== otp ||
    Date.now() > user.registrationOtpExpiry
  ) {
    return res.status(400).json(new Apiresponse(400, null, "Invalid or expired OTP"));
  }

  user.isVerified = true;
  user.registrationOtp = undefined;
  user.registrationOtpExpiry = undefined;
  await user.save();

  const createdUser = await Users.findById(user._id).select("-password");
  return res.status(200).json(new Apiresponse(200, createdUser, "User Registered & Verified Successfully"));
});


const sendOtp = async (user) => {
  const otp = ("" + Math.random()).substring(2, 6);
  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000;
  await user.save();

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Your OTP for Sign-In",
    html: `<p>Your OTP is: <b>${otp}</b></p>`
  };

  await transporter.sendMail(mailOptions);
};

const Loginuser = asynchandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new Apierror(400, "Email or Username is required");
  }

  const user = await Users.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new Apierror(400, "User not found, please sign up first");
  }

  const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });
  await sendOtp(user);
  res.status(200).json({ message: "OTP sent to email" });
});

const verifyOtp = asynchandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await Users.findOne({ email });
  if (!user) {
    throw new Apierror(400, "User not found");
  }
  if (user.otp !== otp || Date.now() > user.otpExpiry) {
    throw new Apierror(400, "Invalid or expired OTP");
  }
  
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  res.status(200).json(new Apiresponse(200, { accessToken, refreshToken }, "Logged in successfully"));
});

const LogoutUser = asynchandler(async (req, res) => {
  const user = await Users.findByIdAndUpdate(req.user?._id, { $unset: { refreshToken: 1 } }, { new: true });
  if (!user) {
    throw new Apierror(400, "User not found");
  }
  res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json({ message: "Logged out successfully" });
});

const getCurrentUser = asynchandler(async (req, res) => {
  res.status(200).json(req.user);
});


const forgotPassword = asynchandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new Apierror(400, "Email is required");
  }

  const user = await Users.findOne({ email });
  if (!user) {
    throw new Apierror(404, "User not found");
  }

  const resetToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; 
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
  };

  await transporter.sendMail(mailOptions);

  res.status(200).json(new Apiresponse(200, null, "Password reset link sent to email"));
});

const resetPassword = asynchandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    throw new Apierror(400, "Token and new password are required");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await Users.findById(decoded.userId);
    if (!user || user.resetPasswordExpires < Date.now()) {
      throw new Apierror(400, "Invalid or expired token");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json(new Apiresponse(200, null, "Password reset successfully"));
  } catch (error) {
    throw new Apierror(400, "Invalid or expired token");
  }
});



const updatePassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new Apierror(400, "Both old and new passwords are required");
  }

  const user = await Users.findById(req.user._id);
  if (!user) {
    throw new Apierror(400, "User not found");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Apierror(400, "Incorrect old password");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json(new Apiresponse(200, null, "Password updated successfully"));
});


const verifyEmailStep1 = asynchandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new Apierror(400, "Email is required");
  }

  const user = await Users.findOne({ email }).select("-password");
  
  if (!user) {
    throw new Apierror(404, "No account found with this email");
  }

  res.status(200).json(
    new Apiresponse(200, { email: user.email }, "Email verified")
  );
});

const updatePasswordStep2 = asynchandler(async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  // 1. Validate input (email already verified in step 1)
  if (!oldPassword || !newPassword) {
    throw new Apierror(400, "Both old and new passwords are required");
  }

  // 2. Find user (email exists because step 1 passed)
  const user = await Users.findOne({ email });
  if (!user) {
    throw new Apierror(404, "User account not found");
  }

  const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordCorrect) {
    throw new Apierror(401, "Current password is incorrect");
  }

  if (oldPassword === newPassword) {
    throw new Apierror(400, "New password must be different from current password");
  }

  if (newPassword.length < 8) {
    throw new Apierror(400, "Password must be at least 8 characters");
  }

  user.password = newPassword;
  await user.save();


  res.status(200).json(
    new Apiresponse(
      200,
      { email: user.email },
      "Password updated successfully"
    )
  );
});


const updateInfo = asynchandler(async (req, res) => {
  const { name, username } = req.body;

  if (!name || !username) {
    throw new Apierror(400, "Both name and username are required");
  }

const existingUser = await Users.findOne({ 
    username, 
    _id: { $ne: req.user._id } 
  });

  if (existingUser) {
    throw new Apierror(400, "Username already taken");
  }

  const updatedUser = await Users.findByIdAndUpdate(
    req.user._id,
    { name, username },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new Apierror(404, "User not found");
  }

  res.status(200).json(
    new Apiresponse(200, updatedUser, "Profile updated successfully")
  );
});

export { registerUser,verifyRegistrationOtp,verifyEmailStep1,updatePasswordStep2,updatePassword, updateInfo,Loginuser, verifyOtp, LogoutUser, getCurrentUser,forgotPassword,resetPassword,testSendMail };
