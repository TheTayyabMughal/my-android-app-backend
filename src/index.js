import dotenv from "dotenv";
import connectDB from "../src/db/db.js";
import { app } from "./app.js";
import mongoose from "mongoose";
import { Services } from "./models/Services.model.js"; // path adjust karo

dotenv.config({ path: "./env" });

// Function to add a service
export const addService = async (serviceName) => {
  try {
    // Check if service already exists
    const existing = await Services.findOne({ name: serviceName });
    if (existing) {
      console.log(`${serviceName} already exists`);
      return existing;
    }

    // Create new service
    const newService = new Services({ name: serviceName });
    const savedService = await newService.save();
    console.log(`${serviceName} added successfully`);
    return savedService;
  } catch (error) {
    console.error("Error adding service:", error);
    throw error;
  }
};

// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    app.listen(process.env.PORT || 5000, "0.0.0.0", async () => {
      console.log(`Server running on port: ${process.env.PORT || 5000}`);

      // Add default services after server starts
    //   await addService("Tailor");
    //   await addService("Laundry");
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed !!!", err);
  });
