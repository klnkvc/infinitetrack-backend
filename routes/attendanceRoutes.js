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
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Batas ukuran file 5MB
});

const router = express.Router();

// Route untuk Check-In
router.post("/checkin", upload.single("upload_image"), checkIn);

// Route untuk Check-Out
router.post("/checkout", checkOut);

module.exports = router;
