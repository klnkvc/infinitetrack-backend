const multer = require("multer");
const path = require("path");

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/files");
  },
  filename: function (req, file, cb) {
    const currentDate = new Date();
    const formattedDate = currentDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const originalName = file.originalname.replace(/\s+/g, "_");

    cb(null, `${formattedDate}-${originalName}`);
  },
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 1024 * 1024 * 5 },
});

module.exports = uploadFile;
