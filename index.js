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

  // Cek apakah email ada di database
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err.message);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not registered" });
    }

    const otp = generateOTP();
    otpCache[email] = otp;

    sendOTP(email, otp)
      .then(() => {
        console.log("OTP sent");
        res.status(200).json({ message: "OTP sent" });
      })
      .catch((error) => {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Failed to send OTP" });
      });
  });
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

  // Cek apakah email ada di database
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err.message);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not registered" });
    }

    // Cek apakah OTP sudah diverifikasi
    if (!otpVerifiedCache.hasOwnProperty(email)) {
      return res
        .status(400)
        .json({ message: "OTP not verified for this email" });
    }

    // Hash password baru
    bcrypt.genSalt(10, (err, salt) => {
      if (err) throw err;
      bcrypt.hash(newPassword, salt, (err, hashedPassword) => {
        if (err) throw err;

        // Update password di database
        const queryUpdatePassword =
          "UPDATE users SET password = ? WHERE email = ?";
        db.query(
          queryUpdatePassword,
          [hashedPassword, email],
          (err, result) => {
            if (err) {
              console.error("Error updating password:", err.message);
              return res
                .status(500)
                .json({ message: "Failed to reset password" });
            }

            // Hapus status verifikasi OTP setelah password berhasil direset
            delete otpVerifiedCache[email];

            res.status(200).json({ message: "Password successfully reset" });
          }
        );
      });
    });
  });
});

// Register
app.post("/register", async (req, res) => {
  const { name, email, password, role, division, annual_balance, annual_used } =
    req.body;

  // Validasi input
  if (
    !name ||
    !email ||
    !password ||
    !role ||
    !division ||
    annual_balance === undefined ||
    annual_used === undefined
  ) {
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

    // Cek dan tambahkan role jika belum ada
    db.query(
      "SELECT * FROM roles WHERE role = ?",
      [role],
      (err, roleResults) => {
        if (err) {
          console.error("Error checking role:", err.message);
          return res.status(500).json({ message: "DB Error" });
        }

        let roleId;

        if (roleResults.length > 0) {
          // Role sudah ada, ambil roleId
          roleId = roleResults[0].roleId;
        } else {
          // Role belum ada, tambahkan ke tabel roles
          db.query(
            "INSERT INTO roles (role) VALUES (?)",
            [role],
            (err, result) => {
              if (err) {
                console.error("Error inserting role:", err.message);
                return res.status(500).json({ message: "Failed to add role" });
              }

              roleId = result.insertId; // Ambil roleId dari role yang baru ditambahkan
            }
          );
        }

        // Cek dan tambahkan division jika belum ada
        db.query(
          "SELECT * FROM divisions WHERE division = ?",
          [division],
          (err, divisionResults) => {
            if (err) {
              console.error("Error checking division:", err.message);
              return res.status(500).json({ message: "DB Error" });
            }

            let divisionId;

            if (divisionResults.length > 0) {
              // Division sudah ada, ambil divisionId
              divisionId = divisionResults[0].divisionId;
            } else {
              // Division belum ada, tambahkan ke tabel divisions
              db.query(
                "INSERT INTO divisions (division) VALUES (?)",
                [division],
                (err, result) => {
                  if (err) {
                    console.error("Error inserting division:", err.message);
                    return res
                      .status(500)
                      .json({ message: "Failed to add division" });
                  }

                  divisionId = result.insertId; // Ambil divisionId dari division yang baru ditambahkan
                }
              );
            }

            // Hash password dan simpan ke database setelah mendapatkan roleId dan divisionId
            bcrypt.genSalt(10, (err, salt) => {
              if (err) throw err;
              bcrypt.hash(password, salt, (err, hashedPassword) => {
                if (err) throw err;

                const query =
                  "INSERT INTO users (name, email, password, roleId, divisionId) VALUES (?, ?, ?, ?, ?)";

                db.query(
                  query,
                  [name, email, hashedPassword, roleId, divisionId],
                  (err, result) => {
                    if (err) {
                      console.error("Error inserting user:", err.message);
                      return res
                        .status(500)
                        .json({ message: "Failed to register user" });
                    }

                    // Ambil userId dari result
                    const userId = result.insertId;

                    // Sisipkan annual_balance dan annual_used ke tabel leave_balance
                    const leaveBalanceQuery =
                      "INSERT INTO leave_balance (userId, annual_balance, annual_used) VALUES (?, ?, ?)";
                    db.query(
                      leaveBalanceQuery,
                      [userId, annual_balance, annual_used],
                      (err) => {
                        if (err) {
                          console.error(
                            "Error inserting leave balance:",
                            err.message
                          );
                          return res.status(500).json({
                            message: "Failed to initialize leave balance",
                          });
                        }

                        // Buat token
                        const token = jwt.sign(
                          { id: userId, role: role },
                          process.env.JWT_SECRET,
                          { expiresIn: "1h" }
                        );

                        res.status(201).json({
                          user: {
                            id: userId,
                            name,
                            email,
                            role,
                            division,
                            annual_balance,
                            annual_used,
                          },
                          token,
                        });
                      }
                    );
                  }
                );
              });
            });
          }
        );
      }
    );
  });
});

// Login user
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const queryFindUser = "SELECT * FROM users WHERE email = ?";
  db.query(queryFindUser, [email], async (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Ambil role berdasarkan roleId dari pengguna
    const queryFindRole = "SELECT * FROM roles WHERE roleId = ?";
    db.query(queryFindRole, [user.roleId], (err, roleResult) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (roleResult.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }

      const userRole = roleResult[0].role; // Ambil nama role

      // Ambil division berdasarkan divisionId dari pengguna
      const queryFindDivision = "SELECT * FROM divisions WHERE divisionId = ?";
      db.query(queryFindDivision, [user.divisionId], (err, divisionResult) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        const division = divisionResult[0].division; // Ambil nama division

        // Ambil annual_balance dan annual_used dari leave_balance berdasarkan userId
        const queryFindLeaveBalance =
          "SELECT annual_balance, annual_used FROM leave_balance WHERE userId = ?";
        db.query(queryFindLeaveBalance, [user.userId], (err, balanceResult) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }

          let annualBalance = 0; // Nilai default jika tidak ada data
          let annualUsed = 0; // Nilai default jika tidak ada data

          if (balanceResult.length > 0) {
            annualBalance = balanceResult[0].annual_balance;
            annualUsed = balanceResult[0].annual_used;
          }

          // Buat token setelah validasi sukses
          const token = jwt.sign(
            { id: user.userId, role: user.roleId },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );

          const userId = user.userId;
          const userName = user.name;
          const currentHour = new Date().getHours();
          let greeting;

          if (currentHour >= 5 && currentHour < 12) {
            greeting = "Good Morning";
          } else if (currentHour >= 12 && currentHour < 17) {
            greeting = "Good Afternoon";
          } else if (currentHour >= 17 && currentHour < 21) {
            greeting = "Good Evening";
          } else {
            greeting = "Good Night";
          }

          // Kirim respons dengan token, userId, userName, userRole, division, greeting, annual_balance, dan annual_used
          res.json({
            token,
            userId,
            userName,
            userRole,
            division,
            greeting,
            annualBalance,
            annualUsed,
          });
        });
      });
    });
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
  "/employee",
  verifyToken,
  checkRole(["Employee", "Management"]),
  (req, res) => {
    res.send("Hello Employee or Management!");
  }
);

// Manajemen access only
app.get("/management", verifyToken, checkRole(["Management"]), (req, res) => {
  res.send("Hello Manajemen!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
