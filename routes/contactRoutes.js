const express = require("express");
const { getContacts } = require("../Controllers/contact_Controller");
const router = express.Router();

router.get("/", getContacts);

module.exports = router;
