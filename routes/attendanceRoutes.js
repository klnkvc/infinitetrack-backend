const express = require("express");
const { verifyToken } = require("../middleware/authMiddleWare");
const { handleAttendance } = require("../Controllers/attendance_Controller");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const today = new Date().toISOString().split("T")[0];

    const formattedName = `${today}-${file.originalname}`;
    cb(null, formattedName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Batas ukuran file 5MB
});

const router = express.Router();

// Route untuk Check-In dan Check-Out
router.post(
  "/users",
  verifyToken,
  upload.single("upload_image"),
  handleAttendance
);

module.exports = router;
