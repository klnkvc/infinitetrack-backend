const express = require("express");
const router = express.Router();
const { loginUser, resetPassword } = require("../Controllers/auth_Controller");

router.post("/login", loginUser);

router.post("/reset-password", resetPassword);

module.exports = router;
