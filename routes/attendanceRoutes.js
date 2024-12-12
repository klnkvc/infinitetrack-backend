const express = require("express");
const {
  handleAttendance,
  getAttendanceOverview,
} = require("../Controllers/attendance_Controller");
const { verifyToken } = require("../middleware/authMiddleWare");
const multer = require("multer");

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
  limits: { fileSize: 1024 * 1024 * 5 },
});

const router = express.Router();

router.post(
  "/users",
  verifyToken,
  upload.single("upload_image"),
  handleAttendance
);

router.get("/users/overview", getAttendanceOverview);

module.exports = router;
