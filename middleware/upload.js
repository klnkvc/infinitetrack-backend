// middleware/upload.js
const multer = require("multer");
const path = require("path");

// Set storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Menentukan direktori tempat menyimpan file
  },
  filename: function (req, file, cb) {
    // Menggunakan nama asli file dengan tambahan timestamp untuk menghindari bentrok nama
    const uniqueSuffix = Date.now();
    cb(
      null,
      uniqueSuffix + "-" + file.originalname // Menggabungkan timestamp dan nama asli file
    );
  },
});

// Set upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Batas ukuran file 5MB
});

module.exports = upload; // Ekspor middleware upload
