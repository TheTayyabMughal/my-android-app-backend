import { Services } from "../models/Services.model.js"; 
import { Admin } from "../models/Admin.model.js";

const defaultServices = [
  { name: "Tailor" },
  { name: "Laundry" }
];

export const initializeServices = async () => {
  try {
    const count = await Services.countDocuments();
    if (count === 0) {
      await Services.insertMany(defaultServices);
      console.log("✅ Default services added!");
    } else {
      console.log("⚠️ Services already initialized.");
    }
  } catch (error) {
    console.error("❌ Error initializing services:", error);
  }
};

export const initializeAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      // Create default admin with credentials from .env or defaults
      const defaultAdmin = {
        username: process.env.ADMIN_USERNAME || "Tayyab",
        email: process.env.ADMIN_EMAIL || "thetmughal@gmail.com",
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "super_admin"
      };

      await Admin.create(defaultAdmin);
      console.log("✅ Default admin created!");
      console.log(`📧 Username: ${defaultAdmin.username}`);
      console.log(`🔑 Password: ${defaultAdmin.password}`);
      console.log("⚠️ Please change the default password after first login!");
    } else {
      console.log("⚠️ Admin already exists.");
    }
  } catch (error) {
    console.error("❌ Error initializing admin:", error);
  }
};
