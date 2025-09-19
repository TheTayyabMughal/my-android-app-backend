// api/index.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "../src/app.js";

// Load environment variables
dotenv.config();

// Global variable to track connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
  } catch (error) {
    isConnected = false;
  }
};

// Connect to database before handling requests
await connectDB();

export default app;