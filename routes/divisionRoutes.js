const express = require("express");
const router = express.Router();

const { getAllDivisions } = require("../Controllers/division_Controller");

router.get("/get", getAllDivisions);

module.exports = router;
