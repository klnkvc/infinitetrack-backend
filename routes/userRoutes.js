const express = require("express");
const {
  insertUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
  register,
} = require("../Controllers/user_Controller");

const router = express.Router();

// Routes
router.post("/register", register);
router.post("/users", insertUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/users", getAllUsers);
router.get("/get/:id", getUserById);

module.exports = router;
