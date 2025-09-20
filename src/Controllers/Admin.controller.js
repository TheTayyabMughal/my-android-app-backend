import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Admin } from "../models/Admin.model.js";
import { Notification } from "../models/Notification.model.js";
import { smartUpload } from "../utils/Fileupload.js";
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

    // Delete old profile picture if exists
    if (admin.profilePic) {
      try {
        await fs.promises.unlink(admin.profilePic);
      } catch (error) {
      }
    }

    // Upload new profile picture
    const profilePic = await smartUpload(req.file);

    if (!profilePic) {
      throw new Apierror(500, "Failed to upload profile picture to cloud");
    }

    // Update admin profile picture
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePic: profilePic.url },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) {
      throw new Apierror(404, "Admin not found after update");
    }


    res.status(200).json(
      new Apiresponse(200, updatedAdmin, "Profile picture updated successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to update profile picture");
  }
});

// Remove Admin Profile Picture
export const removeAdminProfilePic = asynchandler(async (req, res) => {
  try {
    const adminId = req.id;

    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new Apierror(404, "Admin not found");
    }


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


    res.status(200).json(
      new Apiresponse(200, updatedAdmin, "Profile picture removed successfully")
    );
  } catch (error) {
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
    throw new Apierror(500, "Failed to logout admin");
  }
});

// Create Notification
export const createNotification = asynchandler(async (req, res) => {
  try {
    const { title, description, role } = req.body;
    const adminId = req.user._id;

    if (!title || !description || !role) {
      throw new Apierror(400, "Title, description, and role are required");
    }

    const notification = await Notification.create({
      title,
      description,
      role,
      createdBy: adminId,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("createdBy", "username email");

    res.status(201).json(
      new Apiresponse(201, populatedNotification, "Notification created successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to create notification");
  }
});

// Get All Notifications
export const getNotifications = asynchandler(async (req, res) => {
  try {
    const notifications = await Notification.find({ isActive: true })
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(
      new Apiresponse(200, notifications, "Notifications fetched successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to fetch notifications");
  }
});

// Get Notification by ID
export const getNotificationById = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate("createdBy", "username email");

    if (!notification) {
      throw new Apierror(404, "Notification not found");
    }

    res.status(200).json(
      new Apiresponse(200, notification, "Notification fetched successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to fetch notification");
  }
});

// Update Notification
export const updateNotification = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, role } = req.body;

    if (!title || !description || !role) {
      throw new Apierror(400, "Title, description, and role are required");
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { title, description, role },
      { new: true, runValidators: true }
    ).populate("createdBy", "username email");

    if (!notification) {
      throw new Apierror(404, "Notification not found");
    }

    res.status(200).json(
      new Apiresponse(200, notification, "Notification updated successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to update notification");
  }
});

// Delete Notification
export const deleteNotification = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!notification) {
      throw new Apierror(404, "Notification not found");
    }

    res.status(200).json(
      new Apiresponse(200, {}, "Notification deleted successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to delete notification");
  }
});

// Get Notifications by Role (for customers and providers)
export const getNotificationsByRole = asynchandler(async (req, res) => {
  try {
    const { role } = req.params;

    const notifications = await Notification.find({
      role: role,
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json(
      new Apiresponse(200, notifications, "Notifications fetched successfully")
    );
  } catch (error) {
    throw new Apierror(500, "Failed to fetch notifications");
  }
});
