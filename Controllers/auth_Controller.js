const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { otpVerifiedCache } = require("../utils/cache.js");
const { infinite_track_connection: db } = require("../dbconfig.js");

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

    const profilePhoto = user.profile_photo;

    const queryFindRole = "SELECT * FROM roles WHERE roleId = ?";
    db.query(queryFindRole, [user.roleId], (err, roleResult) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (roleResult.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }

      const userRole = roleResult[0].role;

      let positionName = null;
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
              positionName = positionResult[0].positionName;
            }

            handleDivisionAndLeaveBalance(
              user,
              userRole,
              positionName,
              res,
              email,
              profilePhoto
            );
          }
        );
      } else {
        handleDivisionAndLeaveBalance(
          user,
          userRole,
          positionName,
          res,
          email,
          profilePhoto
        );
      }
    });
  });
};

function handleDivisionAndLeaveBalance(
  user,
  userRole,
  positionName,
  res,
  email,
  profilePhoto
) {
  if (user.divisionId) {
    const queryFindDivision = "SELECT * FROM divisions WHERE divisionId = ?";
    db.query(queryFindDivision, [user.divisionId], (err, divisionResult) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      const division =
        divisionResult.length > 0 ? divisionResult[0].division : null;

      const programId =
        divisionResult.length > 0 ? divisionResult[0].programId : null;

      if (programId) {
        const queryFindHeadProgram =
          "SELECT headprogramId FROM head_program WHERE programId = ?";
        db.query(
          queryFindHeadProgram,
          [programId],
          (err, headProgramResult) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Database error", error: err });
            }

            const headprogramId =
              headProgramResult.length > 0
                ? headProgramResult[0].headprogramId
                : null;

            if (headprogramId) {
              const queryFindUserId =
                "SELECT userId FROM head_program WHERE headprogramId = ?";
              db.query(
                queryFindUserId,
                [headprogramId],
                (err, userIdResult) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ message: "Database error", error: err });
                  }

                  const userId =
                    userIdResult.length > 0 ? userIdResult[0].userId : null;

                  if (userId) {
                    const queryFindName =
                      "SELECT name FROM users WHERE userId = ?";
                    db.query(queryFindName, [userId], (err, nameResult) => {
                      if (err) {
                        return res
                          .status(500)
                          .json({ message: "Database error", error: err });
                      }

                      const headprogramname =
                        nameResult.length > 0 ? nameResult[0].name : null;

                      const queryFindLeaveBalance =
                        "SELECT annual_balance, annual_used FROM leave_balance WHERE userId = ?";
                      db.query(
                        queryFindLeaveBalance,
                        [user.userId],
                        (err, balanceResult) => {
                          if (err) {
                            return res.status(500).json({
                              message: "Database error",
                              error: err,
                            });
                          }

                          let annualBalance = 0;
                          let annualUsed = 0;

                          if (balanceResult.length > 0) {
                            annualBalance = balanceResult[0].annual_balance;
                            annualUsed = balanceResult[0].annual_used;
                          }

                          sendResponse(
                            email,
                            res,
                            user,
                            userRole,
                            division,
                            positionName,
                            annualBalance,
                            annualUsed,
                            headprogramname,
                            profilePhoto
                          );
                        }
                      );
                    });
                  } else {
                    handleLeaveBalanceWithoutHeadProgram(
                      email,
                      user,
                      userRole,
                      positionName,
                      division,
                      res,
                      profilePhoto
                    );
                  }
                }
              );
            } else {
              handleLeaveBalanceWithoutHeadProgram(
                email,
                user,
                userRole,
                positionName,
                division,
                res,
                profilePhoto
              );
            }
          }
        );
      } else {
        handleLeaveBalanceWithoutHeadProgram(
          email,
          user,
          userRole,
          positionName,
          division,
          res,
          profilePhoto
        );
      }
    });
  } else {
    handleLeaveBalanceWithoutHeadProgram(
      email,
      user,
      userRole,
      positionName,
      null,
      res,
      profilePhoto
    );
  }
}

function handleLeaveBalanceWithoutHeadProgram(
  email,
  user,
  userRole,
  positionName,
  division,
  res,
  profilePhoto
) {
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
      email,
      res,
      user,
      userRole,
      division,
      positionName,
      annualBalance,
      annualUsed,
      null,
      profilePhoto
    );
  });
}

function sendResponse(
  email,
  res,
  user,
  userRole,
  division,
  positionName,
  annualBalance,
  annualUsed,
  headprogramname,
  profilePhoto
) {
  const token = jwt.sign(
    { id: user.userId, role: user.roleId },
    process.env.JWT_SECRET
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

  const isProfileComplete =
    user.phone_number &&
    user.nip_nim &&
    user.address &&
    user.start_contract &&
    user.end_contract;

  let missingFieldsMessage = "";
  if (!isProfileComplete) {
    missingFieldsMessage = "Please complete your profile information:";
    if (!user.phone_number) missingFieldsMessage += " Phone Number,";
    if (!user.nip_nim) missingFieldsMessage += " NIP/NIM,";
    if (!user.address) missingFieldsMessage += " Address,";
    if (!user.start_contract) missingFieldsMessage += " Start Contract Date,";
    if (!user.end_contract) missingFieldsMessage += " End Contract Date.";
    missingFieldsMessage = missingFieldsMessage.replace(/,\s*$/, ".");
  }

  res.json({
    email,
    token,
    userId,
    userName,
    userRole,
    division,
    positionName,
    greeting,
    annualBalance,
    annualUsed,
    headprogramname,
    phone_number: user.phone_number || null,
    nip_nim: user.nip_nim || null,
    address: user.address || null,
    start_contract: user.start_contract || null,
    end_contract: user.end_contract || null,
    isProfileComplete,
    profilePhoto,
    message: isProfileComplete ? null : missingFieldsMessage,
  });
}

const resetPassword = (req, res) => {
  const { email, newPassword } = req.body;

  // Pastikan email dan password baru ada di dalam request body
  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and new password are required" });
  }

  // Cek apakah OTP telah diverifikasi untuk email ini
  if (!otpVerifiedCache[email]) {
    return res.status(400).json({ message: "OTP not verified for this email" });
  }

  // Ambil user dari database berdasarkan email
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err.message);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not registered" });
    }

    const user = results[0];

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

            // Setelah berhasil, hapus cache OTP
            delete otpVerifiedCache[email];

            res.status(200).json({ message: "Password successfully reset" });
          }
        );
      });
    });
  });
};

module.exports = { loginUser, resetPassword };
