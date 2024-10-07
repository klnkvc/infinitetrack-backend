const speakeasy = require("speakeasy");
const nodemailer = require("nodemailer");

// OTP generator function
function generateOTP() {
  const otp = speakeasy.totp({
    secret: process.env.OTP_SECRET || "secret_key", // Use a secure key in production
    encoding: "base32",
  });
  return otp;
}

// Email sender function
// async function sendOTPEmail(email, otp) {
//   const transporter = nodemailer.createTransport({
//     service: "gmail", // Adjust this according to your email service
//     auth: {
//       user: process.env.EMAIL_USER, // Use environment variable for security
//       pass: process.env.EMAIL_PASS, // Use environment variable for security
//     },
//   });

//   const mailOptions = {
//     from: `"OTP Service" <${process.env.EMAIL_USER}>`, // Use environment variable
//     to: email,
//     subject: "Your OTP Code",
//     text: `Your OTP code is: ${otp}`,
//   };

//   // Send email
//   let info = await transporter.sendMail(mailOptions);
//   console.log("Message sent: %s", info.messageId);
// }

// Controller for OTP-related actions
const otpController = {
  // Route to generate and send OTP
  sendOtp: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = generateOTP();
    try {
      await sendOTPEmail(email, otp);
      res.json({ message: "OTP sent to your email" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send OTP email" });
    }
  },

  // OTP verification function
  verifyOtp: (req, res) => {
    const { otp } = req.body;
    const isVerified = speakeasy.totp.verify({
      secret: process.env.OTP_SECRET || "secret_key", // Use a secure key in production
      encoding: "base32",
      token: otp,
      window: 1, // Allow a 1-timestep window for verification
    });

    res.json({ verified: isVerified });
  },
};

module.exports = otpController;
