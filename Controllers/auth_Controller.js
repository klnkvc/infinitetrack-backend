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

      const userRole = roleResult[0].role;

      // Ambil position berdasarkan positionId dari pengguna
      let positionName = null; // Default jika tidak ada posisi
      if (user.positionId) {
        const queryFindPosition =
          "SELECT positionName FROM positions WHERE positionId = ?";
        db.query(
          queryFindPosition,
          [user.positionId],
          (err, positionResult) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Database error", error: err });
            }

            if (positionResult.length > 0) {
              positionName = positionResult[0].positionName; // Ambil nama posisi jika ditemukan
            }

            // Lanjutkan dengan pencarian division dan leave balance
            handleDivisionAndLeaveBalance(user, userRole, positionName, res);
          }
        );
      } else {
        // Jika user tidak memiliki positionId, langsung lanjut ke pencarian division dan leave balance
        handleDivisionAndLeaveBalance(user, userRole, positionName, res);
      }
    });
  });
};

function handleDivisionAndLeaveBalance(user, userRole, positionName, res) {
  if (user.divisionId) {
    const queryFindDivision = "SELECT * FROM divisions WHERE divisionId = ?";
    db.query(queryFindDivision, [user.divisionId], (err, divisionResult) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      // Cek jika user tidak memiliki divisi
      const division =
        divisionResult.length > 0 ? divisionResult[0].division : null;

      // Ambil annual_balance dan annual_used dari leave_balance berdasarkan userId
      const queryFindLeaveBalance =
        "SELECT annual_balance, annual_used FROM leave_balance WHERE userId = ?";
      db.query(queryFindLeaveBalance, [user.userId], (err, balanceResult) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        let annualBalance = 0;
        let annualUsed = 0;

        if (balanceResult.length > 0) {
          annualBalance = balanceResult[0].annual_balance;
          annualUsed = balanceResult[0].annual_used;
        }

        sendResponse(
          res,
          user,
          userRole,
          division,
          positionName,
          annualBalance,
          annualUsed
        );
      });
    });
  } else {
    // Jika user tidak memiliki divisionId
    const queryFindLeaveBalance =
      "SELECT annual_balance, annual_used FROM leave_balance WHERE userId = ?";
    db.query(queryFindLeaveBalance, [user.userId], (err, balanceResult) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      let annualBalance = 0;
      let annualUsed = 0;

      if (balanceResult.length > 0) {
        annualBalance = balanceResult[0].annual_balance;
        annualUsed = balanceResult[0].annual_used;
      }

      sendResponse(
        res,
        user,
        userRole,
        null,
        positionName,
        annualBalance,
        annualUsed
      );
    });
  }
}

function sendResponse(
  res,
  user,
  userRole,
  division,
  positionName,
  annualBalance,
  annualUsed
) {
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
    greeting = "Good Afternoon ☀";
  } else if (currentHour >= 17 && currentHour < 21) {
    greeting = "Good Evening 🌤";
  } else {
    greeting = "Good Night 🌙";
  }

  // Cek apakah pengguna telah mengisi data tambahan
  const isProfileComplete =
    user.phone_number &&
    user.nip_nim &&
    user.address &&
    user.start_contract &&
    user.end_contract;

  // Pesan jika data belum lengkap
  let missingFieldsMessage = "";
  if (!isProfileComplete) {
    missingFieldsMessage = "Please complete your profile information:";
    if (!user.phone_number) missingFieldsMessage += " Phone Number,";
    if (!user.nip_nim) missingFieldsMessage += " NIP/NIM,";
    if (!user.address) missingFieldsMessage += " Address,";
    if (!user.start_contract) missingFieldsMessage += " Start Contract Date,";
    if (!user.end_contract) missingFieldsMessage += " End Contract Date.";
    missingFieldsMessage = missingFieldsMessage.replace(/,\s*$/, "."); // Hapus koma terakhir
  }

  res.json({
    token,
    userId,
    userName,
    userRole,
    division,
    positionName,
    greeting,
    annualBalance,
    annualUsed,
    phone_number: user.phone_number || null, // Tambahkan data tambahan
    nip_nim: user.nip_nim || null,
    address: user.address || null,
    start_contract: user.start_contract || null,
    end_contract: user.end_contract || null,
    isProfileComplete,
    message: isProfileComplete ? null : missingFieldsMessage, // Pesan jika data belum lengkap
  });
}

const resetPassword = (req, res) => {
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

module.exports = { loginUser, resetPassword };
