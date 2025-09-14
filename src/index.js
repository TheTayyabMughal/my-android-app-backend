import dotenv from "dotenv";
import connectDB from "../src/db/db.js";
import { app } from "./app.js";
import mongoose from "mongoose";
import { Services } from "./models/Services.model.js"; // path adjust karo
import nodemailer from "nodemailer";

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
        console.log("✅ Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Email send failed:", error);
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

          //sendEmail("adnanamin.available@gmail.com", "Dummy Email Test", "Hello! This is a test email from Nodemailer 🚀");
    });
  })
  .catch ((err) => {
    console.log("MongoDB connection failed !!!", err);
});
