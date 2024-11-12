const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  handleLeaveRequest,
  getAllLeaveUsers,
  approveByHeadProgram,
  approveByOperational,
  approveByProgramDirector,
} = require("../Controllers/leave_Controller");

router.post("/users", upload.single("upload_image"), handleLeaveRequest);
router.post("/users/:leaveId/headprogram/approve", approveByHeadProgram);
router.post("/users/:leaveId/operational/approve", approveByOperational);
router.post(
  "/users/:leaveId/programdirector/approve",
  approveByProgramDirector
);
router.get("/history", getAllLeaveUsers);

module.exports = router;
