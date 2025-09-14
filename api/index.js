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
    console.log('Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnected = false;
  }
};

// Connect to database before handling requests
await connectDB();

export default app;