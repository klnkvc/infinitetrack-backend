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
const multer = require("multer");
const path = require("path");
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

// Fungsi untuk mendapatkan ID kategori absensi berdasarkan nama
const getAttendanceCategoryId = (category) => {
  return category === "Work From Office" ? 1 : 2; // 1 untuk WFH, 2 untuk WFO
};

// Fungsi untuk mendapatkan ID status absensi
const getAttendanceStatusId = (status) => {
  return status === "late" ? 1 : 2; // 1 untuk Late, 2 untuk Confirm
};

// Set storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Menentukan direktori tempat menyimpan file
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    ); // Menentukan nama file
  },
});

// Set upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Batas ukuran file 5MB
});

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
  const {
    name,
    email,
    password,
    role,
    division,
    annual_balance,
    annual_used,
    is_headprogram, // Indikator apakah user adalah headprogram
    headprogram, // Nama headprogram jika is_headprogram = true
    is_approver, // Konfirmasi apakah user adalah approver
  } = req.body;

  // Validasi input
  if (
    !name ||
    !email ||
    !password ||
    !role ||
    !division ||
    annual_balance === undefined ||
    annual_used === undefined ||
    (is_headprogram && !headprogram)
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

    // Proses role dan division (sama seperti sebelumnya)
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
          roleId = roleResults[0].roleId;
        } else {
          db.query(
            "INSERT INTO roles (role) VALUES (?)",
            [role],
            (err, result) => {
              if (err) {
                console.error("Error inserting role:", err.message);
                return res.status(500).json({ message: "Failed to add role" });
              }
              roleId = result.insertId;
            }
          );
        }

        // Cek dan tambahkan division
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
              divisionId = divisionResults[0].divisionId;
            } else {
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
                  divisionId = result.insertId;
                }
              );
            }

            // Cek apakah pengguna adalah headprogram
            let headprogramId = null;
            if (is_headprogram) {
              db.query(
                "SELECT * FROM head_program WHERE headprogram = ?",
                [headprogram],
                async (err, headprogramResults) => {
                  if (err) {
                    console.error("Error checking headprogram:", err.message);
                    return res.status(500).json({ message: "DB Error" });
                  }

                  let headprogramId;
                  if (headprogramResults.length > 0) {
                    headprogramId = headprogramResults[0].headprogramId;
                  } else {
                    try {
                      headprogramId = await insertHeadProgram(headprogram);
                    } catch (error) {
                      return res
                        .status(500)
                        .json({ message: "Failed to add headprogram" });
                    }
                  }

                  insertUser(
                    name,
                    email,
                    password,
                    roleId,
                    divisionId,
                    headprogramId,
                    annual_balance,
                    annual_used,
                    is_approver,
                    res
                  );
                }
              );
            } else {
              insertUser(
                name,
                email,
                password,
                roleId,
                divisionId,
                null,
                annual_balance,
                annual_used,
                is_approver,
                res
              );
            }
          }
        );
      }
    );
  });
});

const insertHeadProgram = (headprogram) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO head_program (headprogram) VALUES (?)",
      [headprogram],
      (err, result) => {
        if (err) {
          console.error("Error inserting headprogram:", err.message);
          return reject(err);
        }
        resolve(result.insertId); // Kembalikan ID headprogram yang baru
      }
    );
  });
};

// Fungsi untuk menyisipkan pengguna ke dalam database
const insertUser = (
  name,
  email,
  password,
  roleId,
  divisionId,
  headprogramId,
  annual_balance,
  annual_used,
  is_approver,
  res
) => {
  // Hash password dan simpan ke database
  bcrypt.genSalt(10, (err, salt) => {
    if (err) throw err;
    bcrypt.hash(password, salt, (err, hashedPassword) => {
      if (err) throw err;

      const query =
        "INSERT INTO users (name, email, password, roleId, divisionId, headprogramId) VALUES (?, ?, ?, ?, ?, ?)";

      db.query(
        query,
        [name, email, hashedPassword, roleId, divisionId, headprogramId],
        (err, result) => {
          if (err) {
            console.error("Error inserting user:", err.message);
            return res.status(500).json({ message: "Failed to register user" });
          }

          const userId = result.insertId;
          if (is_approver) {
            db.query(
              "INSERT INTO leave_approver (userId) VALUES (?)",
              [userId],
              (err, result) => {
                if (err) {
                  console.error(
                    "Error inserting into leave_approver:",
                    err.message
                  );
                  return res
                    .status(500)
                    .json({ message: "Failed to add approver" });
                }
              }
            );
          }

          const leaveBalanceQuery =
            "INSERT INTO leave_balance (userId, annual_balance, annual_used) VALUES (?, ?, ?)";
          db.query(
            leaveBalanceQuery,
            [userId, annual_balance, annual_used],
            (err) => {
              if (err) {
                console.error("Error inserting leave balance:", err.message);
                return res
                  .status(500)
                  .json({ message: "Failed to initialize leave balance" });
              }

              const token = jwt.sign(
                { id: userId, role: roleId },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
              );

              res.status(201).json({
                user: {
                  id: userId,
                  name,
                  email,
                  roleId,
                  divisionId,
                  headprogramId,
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
};

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
            greeting = "Good Morning 🌞";
          } else if (currentHour >= 12 && currentHour < 17) {
            greeting = "Good Afternoon ☀️";
          } else if (currentHour >= 17 && currentHour < 21) {
            greeting = "Good Evening 🌤️";
          } else {
            greeting = "Good Night 🌙";
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

//Input HeadProgram
app.post("/headprogram", (req, res) => {
  const { headprogram } = req.body;

  // Validasi input
  if (!headprogram) {
    return res.status(400).json({ message: "Headprogam Input is required" });
  }

  // Query untuk insert ke tabel headprogram (hanya name)
  const query = "INSERT INTO head_program (headprogram) VALUES (?)";

  db.query(query, [headprogram], (err, result) => {
    if (err) {
      console.error("Error inserting headprogram:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    // Response ketika berhasil menambahkan headprogram
    res.status(201).json({
      message: "Headprogram created successfully",
      headprogramId: result.insertId,
      headprogram,
    });
  });
});

//Get HeadProgram
app.get("/headprogram/:headprogramId", (req, res) => {
  const headprogramId = req.params.headprogramId;

  // Query untuk mendapatkan headprogram berdasarkan ID
  const query = "SELECT * FROM head_program WHERE headprogramId = ?";
  db.query(query, [headprogramId], (err, result) => {
    if (err) {
      console.error("Error retrieving headprogram:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Headprogram not found" });
    }

    // Return data headprogram
    res.status(200).json(result[0]);
  });
});

// Update user
app.put("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, password, role } = req.body;

  // Ambil roleId berdasarkan nama role
  const queryFindRoleId = "SELECT roleId FROM roles WHERE role = ?";

  db.query(queryFindRoleId, [role], (err, roleResult) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (roleResult.length === 0) {
      return res.status(400).json({ message: "Role not found" });
    }

    const roleId = roleResult[0].roleId; // Ambil roleId dari hasil query

    // Jika password disediakan, hash password
    let hashedPassword = password;

    if (password) {
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error generating salt", error: err });
        }

        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error hashing password", error: err });
          }
          hashedPassword = hash; // Ganti dengan hashed password
          updateUser();
        });
      });
    } else {
      // Jika password tidak diupdate, panggil updateUser tanpa password baru
      updateUser();
    }

    function updateUser() {
      const queryUpdateUser =
        "UPDATE users SET name = ?, email = ?, password = ?, roleId = ? , updated_at = NOW() WHERE userId = ?";
      db.query(
        queryUpdateUser,
        [name, email, hashedPassword, roleId, userId],
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
          }
          res.json({ message: "User updated successfully" });
        }
      );
    }
  });
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

// Endpoint untuk Check-In
app.post(
  "/attendance/checkin",
  verifyToken,
  upload.single("upload_image"),
  (req, res) => {
    const { attendance_category } = req.body;
    const attendance_category_id = getAttendanceCategoryId(attendance_category);
    const userId = req.user.id;

    const now = new Date();
    const currentHour = now.getHours();

    let attendance_status_id = currentHour < 9 ? 1 : 2;
    let upload_image = null;

    // Cek apakah user WFH (attendance_category_id = 2) dan mengupload gambar
    if (attendance_category_id === 2) {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Image is required for Work From Home" });
      }
      upload_image = req.file.path; // Path gambar yang diupload
    } else {
      // Untuk WFO, kirimkan string kosong atau nilai default jika tidak ada gambar
      upload_image = ""; // Atau bisa menggunakan nilai default seperti 'no_image'
    }

    db.query(
      "INSERT INTO attendance (check_in_time, check_out_time,  userId, attendance_category_id, attendance_status_id, attendance_date, upload_image) VALUES (NOW(), NULL, ?, ?, ?, CURDATE(), ?)",
      [userId, attendance_category_id, attendance_status_id, upload_image],
      (err, result) => {
        if (err) {
          console.error("Error during check-in:", err.message);
          return res.status(500).json({ message: "Failed to check in" });
        }

        const attendanceId = result.insertId;

        const queryAttendanceDetails = `
        SELECT a.attendance_date, s.attendance_status AS attendance_status
        FROM attendance a
        JOIN attendance_status s ON a.attendance_status_id = s.attendance_status_id
        WHERE a.attendanceId = ?
      `;

        db.query(
          queryAttendanceDetails,
          [attendanceId],
          (err, detailsResult) => {
            if (err) {
              console.error(
                "Error retrieving attendance details:",
                err.message
              );
              return res
                .status(500)
                .json({ message: "Failed to retrieve attendance details" });
            }

            res.status(200).json({
              attendanceId,
              attendance_status: detailsResult[0].attendance_status,
            });
          }
        );
      }
    );
  }
);

// Endpoint untuk Check-Out
app.post("/attendance/checkout", verifyToken, (req, res) => {
  const { attendance_category } = req.body;
  const attendance_category_id = getAttendanceCategoryId(attendance_category);
  const userId = req.user.id;

  const now = new Date();
  const currentHour = now.getHours();

  let attendance_status_id = currentHour > 17 ? 3 : 1;

  db.query(
    "INSERT INTO attendance (check_in_time, check_out_time,  userId, attendance_category_id, attendance_status_id, attendance_date) VALUES (NULL, NOW(), ?, ?, ?, CURDATE())",
    [userId, attendance_category_id, attendance_status_id],
    (err, result) => {
      if (err) {
        console.error("Error during check-in:", err.message);
        return res.status(500).json({ message: "Failed to check in" });
      }

      const attendanceId = result.insertId;

      const queryAttendanceDetails = `
        SELECT a.attendance_date, s.attendance_status AS attendance_status
        FROM attendance a
        JOIN attendance_status s ON a.attendance_status_id = s.attendance_status_id
        WHERE a.attendanceId = ?
      `;

      db.query(queryAttendanceDetails, [attendanceId], (err, detailsResult) => {
        if (err) {
          console.error("Error retrieving attendance details:", err.message);
          return res
            .status(500)
            .json({ message: "Failed to retrieve attendance details" });
        }

        res.status(200).json({
          attendanceId,
          attendance_status: detailsResult[0].attendance_status,
        });
      });
    }
  );
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
