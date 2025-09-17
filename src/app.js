import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Routes import
import userRoute from "./routes/User.routes.js";
import servicesRoute from "./routes/Services.route.js";
import applicationRoute from "./routes/Applications.routes.js";
import providersRoute from "./routes/Providers.route.js";
import ridersRoute from "./routes/Rider.route.js";
import uploadRoute from "./routes/Uploads.route.js";
import offersRoute from "./routes/Offers.route.js";
import feedbackRoute from "./routes/Feedback.routes.js";
import measurementRoute from "./routes/Measurement.routes.js";
import ordersRoute from "./routes/Orders.routes.js";
import paymentRoute from "./routes/Payment.routes.js";

const app = express();

// ✅ CORS setup for Expo + APK
app.use(
  cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
app.use("/api/v1/users", userRoute);
app.use("/api/v1/applications", applicationRoute);
app.use("/api/v1/providers", providersRoute);
app.use("/api/v1/services", servicesRoute);
app.use("/api/v1/riders", ridersRoute);
app.use("/api/v1/upload", uploadRoute);
app.use("/api/v1/offers", offersRoute);
app.use("/api/v1/feedback", feedbackRoute);
app.use("/api/v1/measurements", measurementRoute);
app.use("/api/v1/orders", ordersRoute);
app.use("/api/v1/payments", paymentRoute);

// Health check
app.get("/", (req, res) => {
  res.send("✅ Backend is running fine!");
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error("Error middleware caught:", err);
  
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    console.log("Headers already sent, delegating to default handler");
    return next(err);
  }
  
  // Send error response
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

export default app;
