const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const cookieParser = require("cookie-parser");
const { verifyToken, checkRole } = require("./middleware/authMiddleWare.js");
const { infinite_track_connection: db } = require("./dbconfig.js"); // Import koneksi ke database
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// OTP Controller
const otpCache = {};

function generateOTP() {
  return randomstring.generate({ length: 4, charset: "numeric" });
}

// Fungsi untuk mengirim OTP
function sendOTP(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL, // Email Anda
    to: email,
    subject: "OTP Verification",
    html: `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    .email-container {
                        width: 600px; /* Set the desired width */
                        margin: 0 auto; /* Center the container horizontally */
                        border-radius: 10px; /* Rounded corners */
                        overflow: hidden; /* Ensure the rounded corners are applied */
                        border: 1px solid #ccc; /* Add border for consistency */
                    }
                    .header {
                        background-color: #7C3AED;
                        color: #fff;
                        padding: 10px 20px;
                    }
                    .container {
                        font-family: Arial, sans-serif;
                        padding: 18px 20px 18px;
                        color: #000000;
                        background-color: #f9f9f9;
                    }
                    .otp-container {
                        text-align: center;
                        padding: 18px;
                    }
                    .otp {
                        font-size: 18px;
                        font-weight: bold;
                        color: #FFFFFF;
                        border: 1px solid #ccc;
                        padding: 10px;
                        border-radius: 5px;
                        background-color: #7C3AED;
                        display: inline-block;
                    }
                    .footer {
                    background-color: #7C3AED;
                    padding: 15px 20px;
                    color: #FFFFFF;
                    text-align: right; /* Right align footer content */
                    }
                    .footer img {
                        vertical-align: middle; /* Align image vertically in line with text */
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <img src="cid:image" alt="illogo" width="100px">
                    </div>
                    <div class="container">
                        <p>Hello</p>
                        <p>Your OTP code is:</p>
                        <div class="otp-container">
                            <span class="otp">${otp}</span>
                        </div>
                        <p>Please use this OTP to log in. Make sure to verify it promptly.</p>
                        <p>Regards,<br>Infinite Learning</p>
                    </div>
                    <div class="footer">
                        <img src="cid:image" alt="illogo" width="50px"> Infinite Learning
                    </div>
                </div>
            </body>
            </html>`,
  };

  let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER, // Email Anda
      pass: process.env.MAIL_PASS, // Password Email Anda
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error occurred:", error);
    } else {
      console.log("OTP Email sent successfully:", info.response);
    }
  });
}

// Endpoint untuk mengirim OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = generateOTP(); // Menghasilkan OTP
  otpCache[email] = otp; // Menyimpan OTP dalam cache

  try {
    await sendOTP(email, otp); // Mengirim OTP
    console.log("OTP sent");
    res.status(200).json({ message: "OTP sent" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  // Check if email exists in the cache
  if (!otpCache.hasOwnProperty(email)) {
    return res.status(400).json({ message: "Email not found" });
  }

  // Check if OTP matches the one stored in the cache
  if (otpCache[email] === otp.trim()) {
    // Remove OTP from cache after successful verification
    delete otpCache[email];
    return (
      res.status(200).json({ message: "OTP verified" }) &&
      console.log("OTP verified")
    );
  } else {
    return (
      res.status(400).json({ message: "Invalid OTP" }) &&
      console.log("Invalid OTP")
    );
  }
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
app.get("/intern", verifyToken, checkRole(["intern"]), (req, res) => {
  res.send("Hello Intern!");
});

// Karyawan access only
app.get(
  "/karyawan",
  verifyToken,
  checkRole(["karyawan", "manajemen"]),
  (req, res) => {
    res.send("Hello Karyawan or Manajemen!");
  }
);

// Manajemen access only
app.get("/manajemen", verifyToken, checkRole(["manajemen"]), (req, res) => {
  res.send("Hello Manajemen!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
