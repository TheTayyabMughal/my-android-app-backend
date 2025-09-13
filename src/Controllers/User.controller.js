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

const Loginuser = asynchandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email) throw new Apierror(400, "Email is required");
  if (!password) throw new Apierror(400, "Password is required");
  if (!role) throw new Apierror(400, "Role is required");

  // Validate role
  const allowedRoles = ["customer", "provider"]; // add more roles here if needed
  if (!allowedRoles.includes(role)) throw new Apierror(400, "Invalid role");

  // Find user based on role
  let user;
  if (role === "customer") {
    user = await Users.findOne({ email: email.toLowerCase() });
  } else if (role === "provider") {
    user = await ServiceProviders.findOne({ email: email.toLowerCase() });
  }

  if (!user) throw new Apierror(400, "User not found, please sign up first");

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json(new Apiresponse(401, null, "Invalid credentials"));

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, role);

  // Send response including role
  res.status(200).json(
    new Apiresponse(200, { accessToken, refreshToken, role }, "Logged in successfully")
  );
  // await sendOtp(user);
  //res.status(200).json({ message: "OTP sent to email" });
});

const verifyOtp = asynchandler(async (req, res) => {
  console.log("Verifying OTP with data:", req.body);
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


const registerProvider = asynchandler(async (req, res) => {
  try {
    const { username, email, password, services, phoneNo, shopAddress, currentLocation } = req.body;

    // Validation
    if (!username || !email || !password || !phoneNo || !shopAddress || !currentLocation) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ success: false, message: "At least one service is required" });
    }

    // Check for existing provider
    const existingProvider = await ServiceProviders.findOne({
      $or: [{ username: username.toLowerCase() }, { email }]
    });

    if (existingProvider) {
      return res.status(400).json({ success: false, message: "Service provider already exists" });
    }

    // Hash password (only if schema does not handle it)
    const hashedPassword = await bcrypt.hash(password, 10);

    await ServiceProviders.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      email: email.toLowerCase(),
      servicesOffered: services,
      shopAddress,
      currentLocation,
      phoneNo,
    });

    return res
      .status(201)
      .json({ success: true, message: "Service provider created successfully" });

  } catch (err) {
    console.error("Register provider error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
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

export { registerUser, verifyRegistrationOtp, verifyEmailStep1, updatePasswordStep2, updatePassword, updateInfo, Loginuser, verifyOtp, LogoutUser, getCurrentUser, forgotPassword, resetPassword, testSendMail, registerProvider };

