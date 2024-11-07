const express = require("express");
const {
  createHeadProgram,
  getHeadProgramById,
  getAllHeadPrograms,
} = require("../Controllers/headProgram_Controller");

const router = express.Router();

router.post("/headprogram", createHeadProgram);

router.get("/get", getAllHeadPrograms);

router.get("/get/:headprogramId", getHeadProgramById);

module.exports = router;
