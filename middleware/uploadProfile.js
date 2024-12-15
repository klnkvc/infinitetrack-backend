const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed! (JPEG, JPG, PNG)"), false);
  }
};

const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/profile/");
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

const uploadProfile = multer({
  storage: profileStorage,
  limits: {fileSize: 1024 * 1024 * 5},
  fileFilter: fileFilter
})

module.exports = uploadProfile;