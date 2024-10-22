const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); // Jika menggunakan middleware untuk upload
const {
  handleLeaveRequest,
} = require("../Controllers/leaveRequest_Controller");

router.post(
  "/leave-request",
  upload.single("upload_image"),
  handleLeaveRequest
);

module.exports = router;
