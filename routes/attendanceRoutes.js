const express = require("express");
const {
  handleAttendance,
  uploadImage,
  uploadImageNoAuth,
} = require("../Controllers/attendance_Controller");
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

router.post(
  "/users/upload-image",
  verifyToken,
  upload.single("upload_image"),
  uploadImage
);

router.post(
  "/users/upload-image-noauth",
  upload.single("upload_image"),
  uploadImageNoAuth
);

module.exports = router;
