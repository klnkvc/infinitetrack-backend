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
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);

module.exports = router;
