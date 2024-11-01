const express = require("express");
const {
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
  register,
  getAttendanceByUserId,
} = require("../Controllers/user_Controller");

const router = express.Router();
const uploadProfile = require("../middleware/uploadProfile");

router.post("/register", register);
router.put("/:id", uploadProfile.single("profile_photo"), updateUser);
router.delete("/:id", deleteUser);
router.get("/get", getAllUsers);
router.get("/get/:id", getUserById);
router.get("/attendance/:id", getAttendanceByUserId);

module.exports = router;
