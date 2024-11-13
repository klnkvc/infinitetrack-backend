const speakeasy = require("speakeasy");
const sendOTP = require("../utils/nodeMailer");
const { otpVerifiedCache } = require("../utils/cache.js");
const { infinite_track_connection: db } = require("../dbconfig.js");

const otpCache = {};

function generateOTP() {
  const otp = speakeasy.totp({
    secret: process.env.OTP_SECRET || "secret_key",
    encoding: "base32",
  });
  return otp;
}

exports.sendOTP = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err.message);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not registered" });
    }

    const otp = generateOTP();
    otpCache[email] = otp; // Menyimpan OTP yang dikirim

    sendOTP(email, otp)
      .then(() => {
        console.log("OTP sent");
        res.status(200).json({ message: "OTP sent to your email" });
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Failed to send OTP" });
      });
  });
};

exports.verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  // Memverifikasi OTP yang diterima dengan OTP yang dikirim
  const isVerified = speakeasy.totp.verify({
    secret: process.env.OTP_SECRET || "secret_key",
    encoding: "base32",
    token: otp,
    window: 1,
  });

  if (isVerified) {
    otpVerifiedCache[email] = true; // Tandai OTP berhasil diverifikasi
    console.log(`OTP verified for ${email}`);
    return res.status(200).json({ message: "OTP verified" });
  } else {
    return res.status(400).json({ message: "Invalid OTP" });
  }
};
