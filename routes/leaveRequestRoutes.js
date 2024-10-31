const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  handleLeaveRequest,
} = require("../Controllers/leaveRequest_Controller");

router.post("/users", upload.single("upload_image"), handleLeaveRequest);

module.exports = router;
