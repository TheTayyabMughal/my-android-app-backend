import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoute from "./routes/User.routes.js";
import servicesRoute from "./routes/Services.route.js"
import applicationRoute from "./routes/Applications.routes.js"
import providersRoute from "./routes/Providers.route.js"
import ridersRoute from "./routes/Rider.route.js"
import uploadRoute from "./routes/Uploads.route.js"
import offersRoute from "./routes/Offers.route.js"
import feedbackRoute from "./routes/Feedback.routes.js"
import measurementRoute from "./routes/Measurement.routes.js"
import ordersRoute from "./routes/Orders.routes.js"
import paymentRoute from "./routes/Payment.routes.js"


const app = express();


app.use(cors());


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/users", userRoute);
app.use("/api/v1/applications", applicationRoute);
app.use("/api/v1/providers", providersRoute);
app.use("/api/v1/services", servicesRoute);
app.use("/api/v1/riders",ridersRoute)
app.use("/api/v1/upload",uploadRoute)
app.use("/api/v1/offers",offersRoute)
app.use("/api/v1/feedback",feedbackRoute)
app.use("/api/v1/measurements",measurementRoute)
app.use("/api/v1/orders",ordersRoute)
app.use("/api/v1/payments",paymentRoute)


export { app };
