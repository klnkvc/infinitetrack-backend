const express = require("express");
const router = express.Router();
const { loginUser, resetPassword } = require("../Controllers/auth_Controller");

// Rute untuk login user
router.post("/login", loginUser);

// Rute untuk reset password
router.post("/reset-password", resetPassword);

module.exports = router;
