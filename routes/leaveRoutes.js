const express = require("express");
const router = express.Router();
const uploadLeaveUsers = require("../middleware/uploadLeaveUsers");
const {
  handleLeaveRequest,
  getAllLeaveUsers,
  approveByHeadProgram,
  approveByOperational,
  approveByProgramDirector,
  getAssignedLeaveRequests,
  getDeclinedLeaveRequests,
  getApprovedLeaveRequests,
} = require("../Controllers/leave_Controller");

router.post("/users", uploadLeaveUsers.single("upload_image"), handleLeaveRequest);
router.post("/users/:leaveId/headprogram/approve", approveByHeadProgram);
router.post("/users/:leaveId/operational/approve", approveByOperational);
router.post(
  "/users/:leaveId/programdirector/approve",
  approveByProgramDirector
);
router.get("/history", getAllLeaveUsers);
router.get("/users/:role/assigned", getAssignedLeaveRequests);
router.get("/users/:role/declined", getDeclinedLeaveRequests);
router.get("/users/:role/approved", getApprovedLeaveRequests);

module.exports = router;
