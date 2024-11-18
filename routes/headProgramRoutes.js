const express = require("express");
const {
  getHeadProgramById,
  getAllHeadPrograms,
} = require("../Controllers/headProgram_Controller");

const router = express.Router();

router.get("/get", getAllHeadPrograms);

router.get("/get/:headprogramId", getHeadProgramById);

module.exports = router;
