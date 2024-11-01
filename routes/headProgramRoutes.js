// routes/headProgramRoutes.js
const express = require("express");
const {
  createHeadProgram,
  getHeadProgramById,
} = require("../Controllers/headProgram_Controller");

const router = express.Router();

// Rute untuk membuat headprogram baru
router.post("/headprogram", createHeadProgram);

// Rute untuk mendapatkan headprogram berdasarkan ID
router.get("/:headprogramId", getHeadProgramById);

module.exports = router;
