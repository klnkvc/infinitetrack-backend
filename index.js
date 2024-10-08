const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const randomstring = require("randomstring");
const cookieParser = require("cookie-parser");
const { verifyToken, checkRole } = require("./middleware/authMiddleWare.js");
const { infinite_track_connection: db } = require("./dbconfig.js");
const sendOTP = require("./utils/nodeMailer");
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// OTP Controller
const otpCache = {};

let otpVerifiedCache = {};

function generateOTP() {
  return randomstring.generate({ length: 4, charset: "numeric" });
}

// Endpoint untuk mengirim OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP();
  otpCache[email] = otp;

  try {
    await sendOTP(email, otp);
    console.log("OTP sent");
    res.status(200).json({ message: "OTP sent" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  // Cek apakah email dan OTP sesuai
  if (!otpCache.hasOwnProperty(email) || otpCache[email] !== otp.trim()) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Hapus OTP setelah verifikasi sukses
  delete otpCache[email];

  // Simpan status verifikasi OTP
  otpVerifiedCache[email] = true;

  res
    .status(200)
    .json({ message: "OTP verified, you can now reset your password" });
});

app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;

  // Cek apakah email disertakan
  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and new password are required" });
  }

  // Cek apakah OTP sudah diverifikasi
  if (!otpVerifiedCache.hasOwnProperty(email)) {
    return res.status(400).json({ message: "OTP not verified for this email" });
  }

  // Hash password baru
  bcrypt.genSalt(10, (err, salt) => {
    if (err) throw err;
    bcrypt.hash(newPassword, salt, (err, hashedPassword) => {
      if (err) throw err;

      // Update password di database
      const queryUpdatePassword =
        "UPDATE users SET password = ? WHERE email = ?";
      db.query(queryUpdatePassword, [hashedPassword, email], (err, result) => {
        if (err) {
          console.error("Error updating password:", err.message);
          return res.status(500).json({ message: "Failed to reset password" });
        }

        // Hapus status verifikasi OTP setelah password berhasil direset
        delete otpVerifiedCache[email];

        res.status(200).json({ message: "Password successfully reset" });
      });
    });
  });
});

// Register
app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validasi input
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Cek apakah pengguna sudah ada
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err.message);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password dan simpan ke database
    bcrypt.genSalt(10, (err, salt) => {
      if (err) throw err;
      bcrypt.hash(password, salt, (err, hashedPassword) => {
        if (err) throw err;

        const query =
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

        // Hanya mengirim data yang diperlukan
        db.query(query, [name, email, hashedPassword, role], (err, result) => {
          if (err) {
            console.error("Error inserting user:", err.message);
            return res.status(500).json({ message: "Failed to register user" });
          }

          console.log("User inserted with ID:", result.insertId);

          // Buat token
          const token = jwt.sign(
            { id: result.insertId, role: role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );

          res.status(201).json({
            user: {
              id: result.insertId,
              name,
              email,
              role,
            },
            token,
          });
        });
      });
    });
  });
});

// Login user
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const queryFindUser = "SELECT * FROM users WHERE email = ?";
  db.query(queryFindUser, [email], async (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (result.length === 0) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Buat token setelah validasi sukses
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  });
});

// Get all users
app.get("/users", (req, res) => {
  const queryGetAllUsers = "SELECT * FROM users";
  db.query(queryGetAllUsers, (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    res.json(result);
  });
});

// Get user by ID
app.get("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const queryGetUserById = "SELECT * FROM users WHERE id = ?";
  db.query(queryGetUserById, [id], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result[0]);
  });
});

// Update user
app.put("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, password, role } = req.body;

  const queryUpdateUser =
    "UPDATE users SET name = ?, email = ?, password = ?, role = ? , updated_at = NOW() WHERE id = ?";
  db.query(
    queryUpdateUser,
    [name, email, password, role, id],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Database error", error: err });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User updated successfully" });
    }
  );
});

// Delete user
app.delete("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const queryDeleteUser = "DELETE FROM users WHERE id = ?";
  db.query(queryDeleteUser, [id], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  });
});

// Intern access only
app.get("/intern", verifyToken, checkRole(["Internship"]), (req, res) => {
  res.send("Hello Intern!");
});

// Karyawan access only
app.get(
  "/karyawan",
  verifyToken,
  checkRole(["Karyawan", "Manajemen"]),
  (req, res) => {
    res.send("Hello Karyawan or Manajemen!");
  }
);

// Manajemen access only
app.get("/manajemen", verifyToken, checkRole(["Manajemen"]), (req, res) => {
  res.send("Hello Manajemen!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
