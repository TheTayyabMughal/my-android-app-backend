import { Applications } from "../models/Applications.model.js";
import { Services } from "../models/Services.model.js";
import { asynchandler } from "../utils/Asynchandler.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { Apierror } from "../utils/Apierror.js";
import { Users } from "../models/Users.model.js";
import { sendEmail } from "../utils/Nodemailer.js";
import { ServiceProviders } from "../models/ServiceProviders.model.js";
import mongoose from "mongoose";


export const createApplication = asynchandler(async (req, res) => {
  const { username, CNIC, email, password, shopAddress, servicesOffered, phoneNo, longitude, latitude } = req.body;

  if (!username || !email || !password || !shopAddress || !servicesOffered || !phoneNo) {
    throw new Apierror(400, "All fields are required");
  }

  const existingApplication = await Applications.findOne({ $or: [{ username }, { email }] });
  if (existingApplication) {
    throw new Apierror(400, "Application with these details already exists");
  }

  // Generate OTP
  const otp = ("" + Math.floor(1000 + Math.random() * 9000));
  const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  const application = await Applications.create({
    username,
    email,
    password,
    shopAddress,
    servicesOffered,
    phoneNo,
    location: {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    },
    otp,
    otpExpiry,
    isVerified: false,
  });

  // Send OTP email
  await sendEmail(
    email,
    "Your OTP for Service Provider Application",
    `<p>Your OTP is: <b>${otp}</b></p>`
  );

  res.status(201).json(new Apiresponse(201, { email }, "OTP sent to your email. Please verify to complete application."));
});

export const verifyApplicationOtp = asynchandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new Apierror(400, "Email and OTP are required");
  }

  const application = await Applications.findOne({ email });
  if (!application) {
    throw new Apierror(404, "Application not found");
  }
  if (application.isVerified) {
    throw new Apierror(400, "Application already verified");
  }
  if (application.otp !== otp || Date.now() > application.otpExpiry) {
    throw new Apierror(400, "Invalid or expired OTP");
  }

  application.isVerified = true;
  application.otp = undefined;
  application.otpExpiry = undefined;
  await application.save();

  res.status(200).json(new Apiresponse(200, application, "Application verified successfully"));
});

// export const createApplication = asynchandler(async (req, res) => {
//   const { username, CNIC, email, password, shopAddress, servicesOffered, phoneNo,longitude,
//     latitude } = req.body;

//   if (!username || !email || !password  || !shopAddress || !servicesOffered || !phoneNo) {
//     throw new Apierror(400, "All fields are required");
//   }

//   const existingApplication = await Applications.findOne({ $or: [{ username }, { email }] });
//   if (existingApplication) {
//     throw new Apierror(400, "Application with these details already exists");
//   }

//   const application = await Applications.create({
//     username,
//     // CNIC,
//     email,
//     password,
//     // profilePic,
//     shopAddress,
//     servicesOffered,
//     phoneNo,
//     location: {
//       type: "Point",
//       coordinates: [parseFloat(longitude), parseFloat(latitude)]
//     }
//   });

//   res.status(201).json(new Apiresponse(201, application, "Application submitted successfully"));
// });

export const getAllApplications = asynchandler(async (req, res) => {
("getAllApplications called");
("Headers sent before response:", res.headersSent);
  
  const applications = await ServiceProviders.aggregate([
    {
      $lookup: {
        from: "services",             // Services collection name
        localField: "servicesOffered", // This contains ObjectIds
        foreignField: "_id",         // Match with the _id field in services collection
        as: "servicesDetails"         // Store the matched services
      }
    },
    {
      $project: {
        username: 1,
        email: 1,
        phoneNo: 1,
        shopAddress: 1,
        profileStatus: 1,
        approvalFromAdmin: 1,
        profilePic: 1,
        servicesDetails: 1
      }
    }
  ]);

("Applications fetched:", applications.length);
("Headers sent before sending response:", res.headersSent);
  
  const response = new Apiresponse(200, applications, "Applications fetched successfully");
("Response object created:", response);
  
  res.status(200).json(response);
("Response sent successfully");
});

export const getAllPendingApplications = asynchandler(async (req, res) => {
  const applications = await Applications.find({ status: "Pending" }).populate("servicesOffered");
  res.status(200).json(new Apiresponse(200, applications, "Pending applications fetched successfully"));
});

export const getAllApprovedApplications = asynchandler(async (req, res) => {
  const applications = await Applications.find({ status: "Approved" }).populate("servicesOffered");
  res.status(200).json(new Apiresponse(200, applications, "Approved applications fetched successfully"));
});

export const getApplicationById = asynchandler(async (req, res) => {
  const application = await Applications.findById(req.params.id).populate("servicesOffered");

  if (!application) {
    throw new Apierror(404, "Application not found");
  }

  res.status(200).json(new Apiresponse(200, application, "Application fetched successfully"));
});




export const updateApplication = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { approvalFromAdmin } = req.body;

  // Check if application exists
  const application = await ServiceProviders.findById(id);
  if (!application) {
    throw new Apierror(404, "Application not found");
  }

  // Store the previous status to check if it changed
  const previousStatus = application.approvalFromAdmin;
  
  application.approvalFromAdmin = approvalFromAdmin;
  await application.save();

  // Send email notification only if status actually changed
  if (previousStatus !== approvalFromAdmin) {
    const emailSubject = approvalFromAdmin ? "Application Approved ✅" : "Application Rejected ❌";
    const emailMessage = approvalFromAdmin
      ? `Dear ${application.username},\n\nCongratulations! Your application has been approved. You can now start providing services on our platform.\n\nBest regards,\nTailorWash Team`
      : `Dear ${application.username},\n\nWe regret to inform you that your application has been rejected. Please contact support for further details.\n\nBest regards,\nTailorWash Team`;

    try {
(`📧 Attempting to send email to: ${application.email}`);
(`📧 Email subject: ${emailSubject}`);
(`📧 Application status: ${approvalFromAdmin ? 'Approved' : 'Rejected'}`);
      
      const emailResult = await sendEmail(application.email, emailSubject, emailMessage);
(`✅ Email notification sent successfully to ${application.email} for ${approvalFromAdmin ? 'Approved' : 'Rejected'} status`);
(`📧 Email result:`, emailResult);
    } catch (emailError) {
("❌ Failed to send email notification:", emailError.message);
("❌ Email error details:", emailError);
      // Don't throw error - application status should still be updated even if email fails
    }
  }

  res.status(200).json(new Apiresponse(200, application, "Status updated successfully"));
});








export const updateApplicationStatus = asynchandler(async (req, res) => {
  const { status } = req.body;
  const { id: applicationId } = req.params;

(status)

  if (!["Approved", "Rejected"].includes(status)) {
    throw new Apierror(400, "Invalid status. Must be 'Approved' or 'Rejected'.");
  }

  const application = await Applications.findById(applicationId);
  if (!application) {
    throw new Apierror(404, "Application not found");
  }

  if (application.status === "Approved") {
    throw new Apierror(400, "This application has already been approved.");
  }

  let createdUser = null;
  let createdProvider = null;

  if (status === "Approved") {
    createdUser = await Users.create({
      username: application.username,
      email: application.email,
      password: application.password,
      role: "serviceProvider",
    });

    createdProvider = await ServiceProviders.create({
      CNIC: application.CNIC || " ",
      username: application.username,
      email: application.email,
      shopAddress: application.shopAddress,
      phoneNo: application.phoneNo,
      servicesOffered: application.servicesOffered,
      user: createdUser._id,
      location: {
        type: "Point",
        coordinates: [parseFloat(application.location.coordinates[0]), parseFloat(application.location.coordinates[1])]
      }
    });
  }

  application.status = status;
  await application.save();

  const emailSubject = status === "Approved" ? "Application Approved ✅" : "Application Rejected ❌";
  const emailMessage =
    status === "Approved"
      ? `Dear ${application.username},\n\nCongratulations! Your application has been approved. Your account has been created, and you can now log in.\n\nBest regards,\nYour Company`
      : `Dear ${application.username},\n\nWe regret to inform you that your application has been rejected. Please contact support for further details.\n\nBest regards,\nYour Company`;

  try {
(`📧 Attempting to send email to: ${application.email}`);
(`📧 Email subject: ${emailSubject}`);
(`📧 Application status: ${status}`);
    
    const emailResult = await sendEmail(application.email, emailSubject, emailMessage);
(`✅ Email notification sent successfully to ${application.email} for ${status} status`);
(`📧 Email result:`, emailResult);
  } catch (emailError) {
("❌ Failed to send email notification:", emailError.message);
("❌ Email error details:", emailError);
    // Don't throw error - application status should still be updated even if email fails
  }

  res.status(200).json(
    new Apiresponse(200, application, `Application ${status.toLowerCase()} successfully`)
  );
});





export const deleteApplication = asynchandler(async (req, res) => {
  const application = await Applications.findByIdAndDelete(req.params.id);

  if (!application) {
    throw new Apierror(404, "Application not found");
  }

  res.status(200).json(new Apiresponse(200, null, "Application deleted successfully"));
});
