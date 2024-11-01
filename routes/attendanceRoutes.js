const express = require("express");
const {
  handleAttendance,
  getAttendanceOverview,
} = require("../Controllers/attendance_Controller");
const { verifyToken } = require("../middleware/authMiddleWare");
const uploadAttendance = require("../middleware/uploadAttendance");
const router = express.Router();

router.post(
  "/users",
  verifyToken,
  uploadAttendance.single("upload_image"),
  handleAttendance
);

router.get("/users/overview", getAttendanceOverview);

module.exports = router;
