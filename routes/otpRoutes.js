// routes/otpRoutes.js
const express = require("express");
const { sendOTP, verifyOTP } = require("../Controllers/otp");

const router = express.Router();

// Rute untuk mengirim OTP
router.post("/send-otp", sendOTP);

// Rute untuk verifikasi OTP
router.post("/verify-otp", verifyOTP);

module.exports = router;
