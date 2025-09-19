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
    }
  } catch (error) {
  }
};

export const initializeAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      // Create default admin with credentials from .env or defaults
      const defaultAdmin = {
        username: process.env.ADMIN_USERNAME || "Tayyab",
        email: process.env.ADMIN_EMAIL || "tailorwash@gmail.com",
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "super_admin"
      };

      await Admin.create(defaultAdmin);
    }
  } catch (error) {
  }
};
