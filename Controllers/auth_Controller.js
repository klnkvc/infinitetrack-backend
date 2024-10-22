// controllers/auth_Controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { infinite_track_connection: db } = require("../dbconfig.js");

let otpVerifiedCache = {};

const loginUser = async (req, res) => {
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
};

exports.resetPassword = (req, res) => {
  const { email, newPassword } = req.body;

  // Cek apakah email dan password baru disertakan
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
};

module.exports = { loginUser };
