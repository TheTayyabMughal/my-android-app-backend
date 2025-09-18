import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); 

// Option 1: Gmail (Recommended)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "YOUR_GMAIL_EMAIL@gmail.com", // Replace with your Gmail
//     pass: "YOUR_GMAIL_APP_PASSWORD" // Replace with App Password
//   }
// });

// Debug environment variables
console.log("🔍 Environment variables check:");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "***hidden***" : "NOT SET");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);

// Check if environment variables are loaded
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Email credentials not found in environment variables!");
  console.error("❌ Please create .env file with EMAIL_USER and EMAIL_PASS");
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "adnanamin.online@gmail.com", // Fallback
    pass: process.env.EMAIL_PASS || "fpxq drqb sknd uyog" // Fallback
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Option 2: Alternative - Use SendGrid (Free tier available)
// const transporter = nodemailer.createTransport({
//   service: "sendgrid",
//   auth: {
//     user: "apikey",
//     pass: "YOUR_SENDGRID_API_KEY"
//   }
// });

// Option 3: Alternative - Use Mailgun (Free tier available)
// const transporter = nodemailer.createTransport({
//   service: "mailgun",
//   auth: {
//     user: "postmaster@YOUR_DOMAIN.mailgun.org",
//     pass: "YOUR_MAILGUN_PASSWORD"
//   }
// });

// Test transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error);
    console.error("❌ Please generate new Gmail App Password");
  } else {
    console.log("✅ Email transporter is ready to send emails");
  }
});

export const sendEmail = async (to, subject, text) => {
  try {
    console.log("📧 Starting email send process...");
    console.log("📧 To:", to);
    console.log("📧 Subject:", subject);
    console.log("📧 From:", process.env.EMAIL_USER || "adnanamin.online@gmail.com");
    console.log("📧 Host:", process.env.EMAIL_HOST || "smtp.gmail.com");
    console.log("📧 Port:", process.env.EMAIL_PORT || 587);
    console.log("📧 Text length:", text.length);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || "adnanamin.online@gmail.com",
      to,
      subject,
      text,
    };

    console.log("📧 Mail options:", mailOptions);
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📧 Response:`, result.response);
    return result;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error code:", error.code);
    console.error("❌ Full error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

    const generateEmailContent = (order) => {
        const { userinfo, orders, total, paymentMethod, status } = order;
      
        const orderItems = orders
          .map(item => `
            <tr>
              <td><img src="${item.pic}" alt="${item.name}" style="width: 100px; height: auto;"></td>
              <td>${item.name}</td>
              <td>${item.price}</td>
              <td>${item.quantity}</td>
              <td>${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `)
          .join('');
      
        return `
          <h1>Order Confirmation</h1>
          <p>Dear ${userinfo.name},</p>
          <p>Thank you for your order! Here are the details:</p>
          <h2>Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>Product</th>
                <th>Name</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems}
            </tbody>
          </table>
          <p><strong>Order Total:</strong> $${total}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Status:</strong> ${status}</p>
          <h2>Shipping Address</h2>
          <p>${userinfo.name}<br>
          ${userinfo.address}</p>
        `;
      }

   export const sendConfrimationEmail=async(to,order)=>{
     const mailOptions={
        from:"abdullah03350904415@gmail.com",
        to:to,
        subject:"Order Confirmation",
        html:generateEmailContent(order),
     }

     await transporter.sendMail(mailOptions);
   }
