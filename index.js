const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

// Import routes
const { verifyToken, checkRole } = require("./middleware/authMiddleWare.js");
const attendanceRoutes = require("./routes/attendanceRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const headProgramRoutes = require("./routes/headProgramRoutes.js");
const otpRoutes = require("./routes/otpRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const leaveRequestRoutes = require("./routes/leaveRequestRoutes.js");
const divisionRoutes = require("./routes/divisionRoutes.js");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Fungsi untuk mendapatkan ID kategori absensi berdasarkan nama

// // Set storage for Multer
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./uploads/"); // Menentukan direktori tempat menyimpan file
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
//     ); // Menentukan nama file
//   },
// });

// // Set upload middleware
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 5 }, // Batas ukuran file 5MB
// });

// Routes
app.use("/auth", authRoutes);
app.use("/attendance", verifyToken, attendanceRoutes);
app.use("/head-program", headProgramRoutes);
app.use("/otp", verifyToken, otpRoutes);
app.use("/users", userRoutes);
app.use("/divisions", divisionRoutes);
app.use("/leave", leaveRequestRoutes);

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
