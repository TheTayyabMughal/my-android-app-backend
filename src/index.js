import dotenv from "dotenv";
import connectDB from "../src/db/db.js";
import app from "./app.js";
import mongoose from "mongoose";
import { Services } from "./models/Services.model.js"; // path adjust karo
import { initializeServices, initializeAdmin } from "./utils/InitDb.js";
import nodemailer from "nodemailer";

dotenv.config({ path: "./env" });

// Function to add a service
export const addService = async (serviceName) => {
    try {
        // Check if service already exists
        const existing = await Services.findOne({ name: serviceName });
        if (existing) {
            return existing;
        }

        // Create new service
        const newService = new Services({ name: serviceName });
        const savedService = await newService.save();
        return savedService;
    } catch (error) {
        throw error;
    }
};


export const sendEmail = async (to, subject, text) => {
    try {
        // 1. Transporter create karo
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST, // Gmail ka SMTP host
            port: process.env.EMAIL_PORT, // 465 secure port
            secure: true, // true -> SSL use karega (465 ke liye)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 2. Email options define karo
        const mailOptions = {
            from: `"Adnan Test" <${process.env.EMAIL_USER}>`,
            to, // jisko send karni hai email
            subject,
            text,
        };

        // 3. Send email
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        throw error;
    }
};



// Connect to MongoDB and start server
// Connect to MongoDB and start server
connectDB()
  .then(async () => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`✅ Server running on port: ${PORT}`);
      
      try {
        await initializeServices();
        await initializeAdmin();
        console.log("✅ Default services and admin initialized");
      } catch (error) {
        console.error("❌ Initialization error:", error);
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });
