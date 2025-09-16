import { uploadonCloudinary } from "../utils/Fileupload.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Users } from "../models/Users.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import crypto from "crypto"
import mongoose from "mongoose";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

const generateAccessAndRefreshTokens = async (userId, role) => {
  try {
    let user;
    if (role === "provider") {
      user = await ServiceProviders.findById(userId);
    } else if (role === "customer") {
      user = await Users.findById(userId); // default: customer
    }


    if (!user) {
      throw new Apierror(404, `No ${role} found with the given ID`);
    }

    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
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
  try {
    const { username, email, password, role = "customer" } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await Users.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    await Users.create({
      username: username.toLowerCase(),
      password,
      email,
      role,
      isVerified: true, // ✅ Direct verify since no OTP process
    });

    return res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
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

const getProfileInfo = async (req, res) => {
  try {
    const userId = req.id;

    const user = await Users.findById(userId).select('username email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Return the user profile information
    return res.status(200).json({
      success: true,
      data: {
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Error fetching profile info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



const sendOtp = async (user) => {
  const otp = ("" + Math.random()).substring(2, 6);
  user.otp = otp;
  console.log("Generated OTP for login:", otp);
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

const sendEmail = async (to, subject, message, actionText = null, actionUrl = null) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2️⃣ Professional HTML Template
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; background:#f6f6f6; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; padding:20px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.1)">
          <h2 style="color:#333; text-align:center;">${subject}</h2>
          <p style="font-size:16px; color:#555;">${message}</p>
          ${actionText && actionUrl
        ? `<div style="text-align:center; margin:20px 0;">
                   <a href="${actionUrl}" style="background:#007BFF; color:white; text-decoration:none; padding:10px 20px; border-radius:5px; font-size:16px;">
                     ${actionText}
                   </a>
                 </div>`
        : ""
      }
          <p style="font-size:12px; color:#999; text-align:center; margin-top:20px;">
            If you didn’t request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    // 3️⃣ Mail Options
    const mailOptions = {
      from: "TailorWash",
      to,
      subject,
      text: message, // fallback for email clients that don't support HTML
      html: htmlTemplate,
    };

    // 4️⃣ Send Email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
};

// Loginuser function
const Loginuser = asynchandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email) throw new Apierror(400, "Email is required");
  if (!password) throw new Apierror(400, "Password is required");
  if (!role) throw new Apierror(400, "Role is required");

  const allowedRoles = ["customer", "provider", "Admin"];
  if (!allowedRoles.includes(role)) throw new Apierror(400, "Invalid role");

  let user;

  if (role === "customer") {
    user = await Users.findOne({ email: email.toLowerCase() });
  } 
  else if (role === "provider") {
    user = await ServiceProviders.findOne({ email: email.toLowerCase() });

    // ✅ Check if provider account is approved by admin
    if (user && user.approvalFromAdmin === false) {
      return res
        .status(403)
        .json(new Apiresponse(403, null, "Your account is not yet approved by admin."));
    }
  }
  else if (role === "Admin") {
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const accessToken = jwt.sign(
        { role: "Admin" },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
      );
      const refreshToken = jwt.sign(
        { role: "Admin" },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
      );
      return res
        .status(200)
        .json(
          new Apiresponse(200, { accessToken, refreshToken, role }, "Logged in successfully")
        );
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  }

  if (!user) throw new Apierror(400, "User not found, please sign up first");

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json(new Apiresponse(401, null, "Invalid credentials"));
  }

  // ✅ Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // ✅ Hash OTP with SHA-256, convert to lowercase
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex").toLowerCase();

  // ✅ Store hashed OTP and expiry
  user.otp = hashedOTP;
  user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry
  await user.save({ validateBeforeSave: false });

  // Send plain OTP via email/SMS
  await sendEmail(user.email, "Your OTP Code", `Your login OTP is: ${otp}`);

  return res.status(200).json(
    new Apiresponse(
      200,
      { userId: user._id, role, email: user.email },
      "Login successful. OTP sent to your email."
    )
  );
});



const verifyOtp = asynchandler(async (req, res) => {
  const { userId, otp, role } = req.body;
  if (!otp) throw new Apierror(400, "OTP is required");

  const trimmedOtp = otp.toString().trim();

  let user;
  if (role === "provider") {
    user = await ServiceProviders.findById(userId);
  } else {
    user = await Users.findById(userId);
  }

  if (!user) throw new Apierror(400, "User not found");

  // ✅ Hash entered OTP
  const hashedOTP = crypto.createHash("sha256").update(trimmedOtp).digest("hex").toLowerCase();

  // ✅ Ensure DB OTP is lowercase + trimmed
  const dbOTP = (user.otp || "").toString().trim().toLowerCase();

  if (!dbOTP) throw new Apierror(400, "No OTP found. Please request a new one.");
  if (dbOTP !== hashedOTP) throw new Apierror(400, "Invalid OTP");
  if (Date.now() > new Date(user.otpExpiry).getTime()) throw new Apierror(400, "OTP expired");

  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, role);

  res.status(200).json(
    new Apiresponse(200, { accessToken, refreshToken, role }, "Logged in successfully")
  );
});







const registerProvider = asynchandler(async (req, res) => {
  try {
    const { username, email, password, services, phoneNo, shopAddress, currentLocation } = req.body;

    // Validate required fields
    if (!username || !email || !password || !phoneNo || !shopAddress || !currentLocation) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate services array
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ success: false, message: "At least one service is required" });
    }

    // Check if username, email, or phoneNo already exists
    const existingProvider = await ServiceProviders.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        { phoneNo: phoneNo }
      ]
    });

    if (existingProvider) {
      let message = "Service provider already exists";
      if (existingProvider.email === email.toLowerCase()) message = "Email already exists";
      else if (existingProvider.phoneNo === phoneNo) message = "Phone number already exists";
      else if (existingProvider.username === username.toLowerCase()) message = "Username already exists";

      return res.status(400).json({ success: false, message });
    }

    // Hash password and create provider
    const hashedPassword = await bcrypt.hash(password, 10);
    const newProvider = await ServiceProviders.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      email: email.toLowerCase(),
      servicesOffered: services,
      shopAddress,
      currentLocation,
      phoneNo,
    });

    return res.status(201).json({
      success: true,
      message: "Service provider created successfully",
      provider: newProvider,
    });

  } catch (err) {
    console.error("🔥 Error in registerProvider:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
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

export { registerUser, verifyRegistrationOtp, verifyEmailStep1, updatePasswordStep2, updatePassword, updateInfo, Loginuser, verifyOtp, LogoutUser, getCurrentUser, forgotPassword, resetPassword, testSendMail, registerProvider, getProfileInfo };

