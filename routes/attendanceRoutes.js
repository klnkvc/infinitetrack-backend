// routes/attendanceRoutes.js
const express = require("express");
const { verifyToken } = require("../middleware/authMiddleWare");
const { checkIn, checkOut } = require("../Controllers/attendance_Controller");
const multer = require("multer");
const path = require("path");

// Setup multer untuk file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Memberi nama unik pada gambar
  },
});
const upload = multer({ storage });

const router = express.Router();

// Route untuk Check-In
router.post(
  "/attendance/checkin",
  verifyToken,
  upload.single("upload_image"),
  checkIn
);

// Route untuk Check-Out
router.post("/attendance/checkout", verifyToken, checkOut);

module.exports = router;
