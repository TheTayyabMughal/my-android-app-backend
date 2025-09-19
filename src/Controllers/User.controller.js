import { smartUpload } from "../utils/Fileupload.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { Users } from "../models/Users.model.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import { Admin } from "../models/Admin.model.js";
import crypto from "crypto"
import mongoose from "mongoose";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
    pass: process.env.EMAIL_PASS || "fpxq drqb sknd uyog"
  },
  tls: {
    rejectUnauthorized: false
  }
});

const generateAccessAndRefreshTokens = async (userId, role) => {
  try {
  let user;
  if (role === "provider") {
    user = await ServiceProviders.findById(userId);
  } else if (role === "Admin") {
    user = await Admin.findById(userId);
  } else {
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
      from: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
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

    let profilePicUrl = null;
    
    // Handle profile picture upload if provided
    if (req.file) {
      try {
        const profilePicResponse = await smartUpload(req.file);
        if (profilePicResponse?.url) {
          profilePicUrl = profilePicResponse.url;
        }
      } catch (uploadError) {
        console.error("Profile picture upload error:", uploadError);
        return res
          .status(400)
          .json({ success: false, message: "Error uploading profile picture" });
      }
    }

    const newUser = await Users.create({
      username: username.toLowerCase(),
      password,
      email,
      role,
      profilePic: profilePicUrl,
      isVerified: true, // ✅ Direct verify since no OTP process
    });

    // Return user data without password
    const userResponse = await Users.findById(newUser._id).select("-password -refreshToken");

    return res
      .status(201)
      .json({ 
        success: true, 
        message: "User created successfully",
        user: userResponse
      });
  } catch (err) {
    console.error("Registration error:", err);
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

    const user = await Users.findById(userId).select('username email profilePic');

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
        email: user.email,
        profilePic: user.profilePic
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

const updateProfilePic = asynchandler(async (req, res) => {
  try {
    const userId = req.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required"
      });
    }

    // Upload new profile picture to Cloudinary
    const profilePicResponse = await smartUpload(req.file);
    if (!profilePicResponse?.url) {
      return res.status(400).json({
        success: false,
        message: "Error uploading profile picture"
      });
    }

    // Update user's profile picture
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { profilePic: profilePicResponse.url },
      { new: true }
    ).select('username email profilePic');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Error updating profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

const removeProfilePic = asynchandler(async (req, res) => {
  try {
    const userId = req.id;

    // Update user to remove profile picture
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { profilePic: null },
      { new: true }
    ).select('username email profilePic');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("Error removing profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Provider Profile Picture Functions
const getProviderProfileInfo = async (req, res) => {
  try {
    const providerId = req.id;

    const provider = await ServiceProviders.findById(providerId).select('username email profilePic phoneNo shopAddress servicesOffered');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    // Return the provider profile information
    return res.status(200).json({
      success: true,
      data: {
        username: provider.username,
        email: provider.email,
        profilePic: provider.profilePic,
        phoneNo: provider.phoneNo,
        shopAddress: provider.shopAddress,
        servicesOffered: provider.servicesOffered
      }
    });

  } catch (error) {
    console.error("Error fetching provider profile info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updateProviderProfilePic = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required"
      });
    }

    // Upload new profile picture to Cloudinary
    const profilePicResponse = await smartUpload(req.file);
    if (!profilePicResponse?.url) {
      return res.status(400).json({
        success: false,
        message: "Error uploading profile picture"
      });
    }

    // Update provider's profile picture
    const updatedProvider = await ServiceProviders.findByIdAndUpdate(
      providerId,
      { profilePic: profilePicResponse.url },
      { new: true }
    ).select('username email profilePic phoneNo shopAddress servicesOffered');

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        username: updatedProvider.username,
        email: updatedProvider.email,
        profilePic: updatedProvider.profilePic,
        phoneNo: updatedProvider.phoneNo,
        shopAddress: updatedProvider.shopAddress,
        servicesOffered: updatedProvider.servicesOffered
      }
    });

  } catch (error) {
    console.error("Error updating provider profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

const removeProviderProfilePic = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;

    // Update provider to remove profile picture
    const updatedProvider = await ServiceProviders.findByIdAndUpdate(
      providerId,
      { profilePic: null },
      { new: true }
    ).select('username email profilePic phoneNo shopAddress servicesOffered');

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
      data: {
        username: updatedProvider.username,
        email: updatedProvider.email,
        profilePic: updatedProvider.profilePic,
        phoneNo: updatedProvider.phoneNo,
        shopAddress: updatedProvider.shopAddress,
        servicesOffered: updatedProvider.servicesOffered
      }
    });

  } catch (error) {
    console.error("Error removing provider profile picture:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

const updateProviderProfile = asynchandler(async (req, res) => {
  try {
    const providerId = req.id;
    const { username, phoneNo, shopAddress } = req.body;

    // Validate required fields
    if (!username || !phoneNo || !shopAddress) {
      return res.status(400).json({
        success: false,
        message: "Username, phone number, and shop address are required"
      });
    }

    // Check if username is already taken by another provider
    const existingProvider = await ServiceProviders.findOne({
      username: username.toLowerCase(),
      _id: { $ne: providerId }
    });

    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: "Username already taken"
      });
    }

    // Check if phone number is already taken by another provider
    const existingPhone = await ServiceProviders.findOne({
      phoneNo: phoneNo,
      _id: { $ne: providerId }
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already taken"
      });
    }

    // Update provider profile
    const updatedProvider = await ServiceProviders.findByIdAndUpdate(
      providerId,
      {
        username: username.toLowerCase(),
        phoneNo,
        shopAddress
      },
      { new: true }
    ).select('username email profilePic phoneNo shopAddress servicesOffered');

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        username: updatedProvider.username,
        email: updatedProvider.email,
        profilePic: updatedProvider.profilePic,
        phoneNo: updatedProvider.phoneNo,
        shopAddress: updatedProvider.shopAddress,
        servicesOffered: updatedProvider.servicesOffered
      }
    });

  } catch (error) {
    console.error("Error updating provider profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});



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
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
        pass: process.env.EMAIL_PASS || "fpxq drqb sknd uyog"
      },
      tls: {
        rejectUnauthorized: false
      }
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
    // Find admin by email in database
    user = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  }

  if (!user) throw new Apierror(400, "User not found, please sign up first");

  // Compare password (only for non-Admin users)
  if (role !== "Admin") {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json(new Apiresponse(401, null, "Invalid credentials"));
    }
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
  } else if (role === "Admin") {
    user = await Admin.findById(userId);
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
    console.log("Provider registration request body:", req.body);
    console.log("Provider registration request file:", req.file);
    
    const { username, email, password, services, phoneNo, shopAddress, currentLocation } = req.body;

    // Parse JSON fields from FormData
    let parsedServices = services;
    let parsedCurrentLocation = currentLocation;

    if (typeof services === 'string') {
      try {
        parsedServices = JSON.parse(services);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid services format" });
      }
    }

    if (typeof currentLocation === 'string') {
      try {
        parsedCurrentLocation = JSON.parse(currentLocation);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid location format" });
      }
    }

    // Validate required fields
    if (!username || !email || !password || !phoneNo || !shopAddress || !parsedCurrentLocation) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate services array
    if (!Array.isArray(parsedServices) || parsedServices.length === 0) {
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

    let profilePicUrl = null;
    
    // Handle profile picture upload if provided
    if (req.file) {
      try {
        const profilePicResponse = await smartUpload(req.file);
        if (profilePicResponse?.url) {
          profilePicUrl = profilePicResponse.url;
        }
      } catch (uploadError) {
        console.error("Profile picture upload error:", uploadError);
        return res
          .status(400)
          .json({ success: false, message: "Error uploading profile picture" });
      }
    }

    // Hash password and create provider
    const hashedPassword = await bcrypt.hash(password, 10);
    const newProvider = await ServiceProviders.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      email: email.toLowerCase(),
      servicesOffered: parsedServices,
      shopAddress,
      currentLocation: parsedCurrentLocation,
      phoneNo,
      profilePic: profilePicUrl,
    });

    // Return provider data without password
    const providerResponse = await ServiceProviders.findById(newProvider._id).select("-password");

    return res.status(201).json({
      success: true,
      message: "Service provider created successfully",
      provider: providerResponse,
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
  const user = await Users.findByIdAndUpdate(req.id, { $unset: { refreshToken: 1 } }, { new: true });
  if (!user) {
    throw new Apierror(400, "User not found");
  }
  res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json({ message: "Logged out successfully" });
});

const getCurrentUser = asynchandler(async (req, res) => {
  const user = await Users.findById(req.id).select("-password -refreshToken");
  if (!user) {
    throw new Apierror(404, "User not found");
  }
  res.status(200).json(user);
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

  const user = await Users.findById(req.id);
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
  const { username } = req.body;

  if (!username) {
    throw new Apierror(400, "Username is required");
  }

  const existingUser = await Users.findOne({
    username: username.toLowerCase(),
    _id: { $ne: req.id }
  });

  if (existingUser) {
    throw new Apierror(400, "Username already taken");
  }

  const updatedUser = await Users.findByIdAndUpdate(
    req.id,
    { username: username.toLowerCase() },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new Apierror(404, "User not found");
  }

  res.status(200).json(
    new Apiresponse(200, updatedUser, "Profile updated successfully")
  );
});

export { registerUser, verifyRegistrationOtp, verifyEmailStep1, updatePasswordStep2, updatePassword, updateInfo, Loginuser, verifyOtp, LogoutUser, getCurrentUser, forgotPassword, resetPassword, testSendMail, registerProvider, getProfileInfo, updateProfilePic, removeProfilePic, getProviderProfileInfo, updateProviderProfilePic, removeProviderProfilePic, updateProviderProfile };

