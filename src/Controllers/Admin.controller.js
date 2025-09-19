import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Admin } from "../models/Admin.model.js";
import { uploadonCloudinary } from "../utils/Fileupload.js";
import fs from "fs";

// Register Admin (for initial setup)
export const registerAdmin = asynchandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new Apierror(400, "All fields are required");
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
    });

    if (existingAdmin) {
      throw new Apierror(409, "Admin already exists");
    }

    // Create admin
    const admin = await Admin.create({
      username,
      email,
      password,
    });

    const createdAdmin = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );

    res.status(201).json(
      new Apiresponse(201, createdAdmin, "Admin registered successfully")
    );
  } catch (error) {
    console.error("Error registering admin:", error);
    throw new Apierror(500, "Failed to register admin");
  }
});

// Login Admin
export const loginAdmin = asynchandler(async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new Apierror(400, "Username and password are required");
    }

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!admin) {
      throw new Apierror(401, "Invalid credentials");
    }

    // Check password
    const isPasswordValid = await admin.isPasswordCorrect(password);

    if (!isPasswordValid) {
      throw new Apierror(401, "Invalid credentials");
    }

    // Generate tokens
    const accessToken = admin.generateAccessToken();

    // Remove sensitive fields
    const loggedInAdmin = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );

    res.status(200).json(
      new Apiresponse(
        200,
        {
          admin: loggedInAdmin,
          accessToken,
        },
        "Admin logged in successfully"
      )
    );
  } catch (error) {
    console.error("Error logging in admin:", error);
    throw new Apierror(500, "Failed to login admin");
  }
});

// Get Admin Profile
export const getAdminProfile = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }

    res.status(200).json(
      new Apiresponse(200, admin, "Admin profile retrieved successfully")
    );
  } catch (error) {
    console.error("Error getting admin profile:", error);
    throw new Apierror(500, "Failed to get admin profile");
  }
});

// Update Admin Profile
export const updateAdminProfile = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;
    const { username, email } = req.body;

    if (!username || !email) {
      throw new Apierror(400, "Username and email are required");
    }

    // Check if username or email already exists (excluding current admin)
    const existingAdmin = await Admin.findOne({
      $and: [
        { _id: { $ne: adminId } },
        { $or: [{ username }, { email }] },
      ],
    });

    if (existingAdmin) {
      throw new Apierror(409, "Username or email already exists");
    }

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { username, email },
      { new: true, runValidators: true }
    ).select("-password");

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }

    res.status(200).json(
      new Apiresponse(200, admin, "Admin profile updated successfully")
    );
  } catch (error) {
    console.error("Error updating admin profile:", error);
    throw new Apierror(500, "Failed to update admin profile");
  }
});

// Update Admin Password
export const updateAdminPassword = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new Apierror(400, "Current password and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Apierror(400, "New password must be at least 6 characters long");
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }

    // Check current password
    const isCurrentPasswordValid = await admin.isPasswordCorrect(currentPassword);

    if (!isCurrentPasswordValid) {
      throw new Apierror(400, "Current password is incorrect");
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.status(200).json(
      new Apiresponse(200, {}, "Password updated successfully")
    );
  } catch (error) {
    console.error("Error updating admin password:", error);
    throw new Apierror(500, "Failed to update password");
  }
});

// Update Admin Profile Picture
export const updateAdminProfilePic = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;

    if (!req.file) {
      throw new Apierror(400, "Profile picture is required");
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }

    // Note: Cloudinary handles its own cleanup, no need to delete local files
    // The old profile picture URL will be replaced in the database

    // Upload new profile picture
    const profilePicPath = req.file.path;
    console.log("🔍 Uploading profile picture from path:", profilePicPath);
    
    const profilePic = await uploadonCloudinary(profilePicPath);

    if (!profilePic) {
      console.error("❌ Failed to upload to Cloudinary");
      throw new Apierror(500, "Failed to upload profile picture to cloud");
    }

    console.log("✅ Profile picture uploaded successfully:", profilePic.url);

    // Update admin profile picture
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePic: profilePic.url },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) {
      throw new Apierror(404, "Admin not found after update");
    }

    console.log("✅ Admin profile picture updated in database");

    res.status(200).json(
      new Apiresponse(200, updatedAdmin, "Profile picture updated successfully")
    );
  } catch (error) {
    console.error("Error updating admin profile picture:", error);
    throw new Apierror(500, "Failed to update profile picture");
  }
});

// Remove Admin Profile Picture
export const removeAdminProfilePic = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;
    console.log("🔍 Removing profile picture for admin:", adminId);

    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }

    console.log("🔍 Current admin profile pic:", admin.profilePic);

    // Note: We don't delete from Cloudinary as it's not a local file path
    // Cloudinary URLs are managed separately

    // Remove profile picture from database
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePic: null },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) {
      throw new Apierror(404, "Admin not found after update");
    }

    console.log("✅ Admin profile picture removed from database");

    res.status(200).json(
      new Apiresponse(200, updatedAdmin, "Profile picture removed successfully")
    );
  } catch (error) {
    console.error("Error removing admin profile picture:", error);
    throw new Apierror(500, "Failed to remove profile picture");
  }
});

// Logout Admin
export const logoutAdmin = asynchandler(async (req, res) => {
  try {
    res.status(200).json(
      new Apiresponse(200, {}, "Admin logged out successfully")
    );
  } catch (error) {
    console.error("Error logging out admin:", error);
    throw new Apierror(500, "Failed to logout admin");
  }
});
