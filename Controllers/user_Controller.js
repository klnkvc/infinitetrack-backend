const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { infinite_track_connection: db } = require("../dbconfig.js");

const queryAsync = (query, values) => {
  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      is_hasDivision,
      division,
      is_hasProgram,
      program,
      position,
      annual_balance,
      annual_used,
      isHeadProgram,
      isApprover,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !role ||
      !position ||
      annual_balance === undefined ||
      annual_used === undefined ||
      isHeadProgram === undefined ||
      isApprover === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validasi password
    const passwordRegex =
      /^(?=.[A-Z])(?=.\d)(?=.[@$!%?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include an uppercase letter, a number, and a special character.",
      });
    }

    const existingUser = await queryAsync(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    let roleResults = await queryAsync("SELECT * FROM roles WHERE role = ?", [
      role,
    ]);
    let roleId;
    if (roleResults.length > 0) {
      roleId = roleResults[0].roleId;
    } else {
      const roleInsertResult = await queryAsync(
        "INSERT INTO roles (role) VALUES (?)",
        [role]
      );
      roleId = roleInsertResult.insertId;
    }

    let divisionId = null;
    let programId = null;

    if (isHeadProgram) {
      let programResults = await queryAsync(
        "SELECT * FROM programs WHERE programName = ?",
        [program]
      );
      if (programResults.length > 0) {
        programId = programResults[0].programId;
      } else {
        const programInsertResult = await queryAsync(
          "INSERT INTO programs (programName) VALUES (?)",
          [program]
        );
        programId = programInsertResult.insertId;
      }
    } else if (is_hasDivision && is_hasProgram) {
      let programResults = await queryAsync(
        "SELECT * FROM programs WHERE programName = ?",
        [program]
      );
      if (programResults.length > 0) {
        programId = programResults[0].programId;
      } else {
        const programInsertResult = await queryAsync(
          "INSERT INTO programs (programName) VALUES (?)",
          [program]
        );
        programId = programInsertResult.insertId;
      }

      let divisionResults = await queryAsync(
        "SELECT * FROM divisions WHERE division = ?",
        [division]
      );
      if (divisionResults.length > 0) {
        divisionId = divisionResults[0].divisionId;
      } else {
        const divisionInsertResult = await queryAsync(
          "INSERT INTO divisions (programId, division) VALUES (?, ?)",
          [programId, division]
        );
        divisionId = divisionInsertResult.insertId;
      }
    }

    let positionResults = await queryAsync(
      "SELECT * FROM positions WHERE positionName = ?",
      [position]
    );
    let positionId;
    if (positionResults.length > 0) {
      positionId = positionResults[0].positionId;
    } else {
      const positionInsertResult = await queryAsync(
        "INSERT INTO positions (positionName) VALUES (?)",
        [position]
      );
      positionId = positionInsertResult.insertId;
    }

    await insertUser(
      name,
      email,
      password,
      roleId,
      divisionId,
      programId,
      positionId,
      annual_balance,
      annual_used,
      isHeadProgram,
      isApprover,
      res
    );
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

const insertUser = async (
  name,
  email,
  password,
  roleId,
  divisionId,
  programId,
  positionId,
  annual_balance,
  annual_used,
  isHeadProgram,
  isApprover,
  res
) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userInsertResult = await queryAsync(
      "INSERT INTO users (name, email, password, roleId, divisionId, positionId) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, roleId, divisionId, positionId]
    );

    const userId = userInsertResult.insertId;
    await queryAsync(
      "INSERT INTO leave_balance (userId, annual_balance, annual_used) VALUES (?, ?, ?)",
      [userId, annual_balance, annual_used]
    );

    if (isHeadProgram) {
      await queryAsync(
        "INSERT INTO head_program (userId, programId) VALUES (?, ?)",
        [userId, programId]
      );
    }

    if (isApprover) {
      await queryAsync("INSERT INTO leave_approver (userId) VALUES (?)", [
        userId,
      ]);
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
        annual_balance,
        annual_used,
      },
      token: {
        token,
      },
    });
  } catch (err) {
    console.error("Error inserting user:", err.message);
    res.status(500).json({ message: "Failed to register user" });
  }
};

const updateUser = (req, res) => {
  const userId = parseInt(req.params.id);
  const { phone_number, nip_nim, address, start_contract, end_contract } =
    req.body;

  const profile_photo = req.file ? req.file.path : null;

  const queryGetUser = `
    SELECT nip_nim, address, start_contract, end_contract, profile_photo
    FROM users 
    WHERE userId = ?
  `;

  db.query(queryGetUser, [userId], (err, userResult) => {
    if (err) {
      console.error("Database error while fetching user:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    const existingUserData = userResult[0];
    const dataIsFullyUpdated =
      existingUserData.nip_nim &&
      existingUserData.start_contract &&
      existingUserData.end_contract;

    const updateUserQuery = (fields, values) => {
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const query = `UPDATE users SET ${setClause} WHERE userId = ?`;

      db.query(query, [...values, userId], (err, result) => {
        if (err) {
          console.error("Database error while updating user:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        res.status(201).json({ message: "User updated successfully." });
      });
    };

    if (dataIsFullyUpdated) {
      if (nip_nim || start_contract || end_contract) {
        return res.status(400).json({
          message:
            "nip_nim, start_contract, and end_contract cannot be updated.",
        });
      }

      const fields = [];
      const values = [];

      if (phone_number) {
        fields.push("phone_number");
        values.push(phone_number);
      }

      if (address) {
        fields.push("address");
        values.push(address);
      }

      if (profile_photo) {
        fields.push("profile_photo");
        values.push(profile_photo);
      }

      if (fields.length === 0) {
        return res.status(400).json({
          message: "No fields to update.",
        });
      }

      return updateUserQuery(fields, values);
    }

    if (nip_nim && start_contract && end_contract) {
      const fields = [
        "phone_number",
        "nip_nim",
        "address",
        "start_contract",
        "end_contract",
      ];
      const values = [
        phone_number,
        nip_nim,
        address,
        start_contract,
        end_contract,
      ];

      if (profile_photo) {
        fields.push("profile_photo");
        values.push(profile_photo);
      }

      db.query(
        `UPDATE users SET ${fields
          .map((f) => `${f} = ?`)
          .join(", ")} WHERE userId = ?`,
        [...values, userId],
        (err, result) => {
          if (err) {
            console.error(
              "Database error while updating contract details:",
              err
            );
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }

          const start = new Date(start_contract);
          const end = new Date(end_contract);
          const monthsDifference =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
          const annual_balance = Math.max(0, monthsDifference);

          db.query(
            `UPDATE leave_balance SET annual_balance = ? WHERE userId = ?`,
            [annual_balance, userId],
            (err) => {
              if (err) {
                console.error(
                  "Database error while updating leave balance:",
                  err
                );
                return res
                  .status(500)
                  .json({ message: "Database error", error: err });
              }
              res.status(201).json({
                message: "Profile updated successfully.",
                annual_balance,
              });
            }
          );
        }
      );
    } else {
      res.status(400).json({
        message:
          "All contract details (nip_nim, start_contract, end_contract) must be provided.",
      });
    }
  });
};

const deleteUser = (req, res) => {
  const userId = parseInt(req.params.id);

  const queryDeleteUser = "DELETE FROM users WHERE userId = ?";
  db.query(queryDeleteUser, [userId], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Database error", error: err });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  });
};

const getAllUsers = (req, res) => {
  const queryGetAllUsers = "SELECT * FROM users";
  db.query(queryGetAllUsers, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(result);
  });
};

const getUserById = (req, res) => {
  const id = parseInt(req.params.id);

  const queryGetUserById = `
    SELECT 
      users.name AS name, 
      users.divisionId AS divisionId, 
      divisions.division AS division, 
      head_user.name AS headprogram 
    FROM 
      users 
    LEFT JOIN 
      divisions ON users.divisionId = divisions.divisionId 
    LEFT JOIN 
      head_program ON divisions.programId = head_program.programId 
    LEFT JOIN 
      users AS head_user ON head_program.userId = head_user.userId 
    WHERE 
      users.userId = ?;
  `;

  db.query(queryGetUserById, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = {
      name: result[0].name,
      divisionId: result[0].divisionId,
      division: result[0].division,
      headprogram: result[0].headprogram,
    };

    res.json(user);
  });
};

const getAttendanceByUserId = (req, res) => {
  const id = parseInt(req.params.id);

  const queryGetAttendanceByUserId = `
    SELECT 
      a.attendanceId AS attendanceId,
      a.userId AS userId,
      a.attendance_date AS attendance_date,
      a.check_in_time AS check_in_time,
      a.check_out_time AS check_out_time,
      a.latitude AS latitude,
      a.longitude AS longitude,
      a.upload_image AS upload_image,
      a.notes AS notes,
      ac.attendance_category AS attendance_category,
      s.attendance_status AS attendance_status
    FROM 
      attendance a
    LEFT JOIN 
      attendance_category ac ON a.attendance_category_id = ac.attendance_category_id
    LEFT JOIN 
      attendance_status s ON a.attendance_status_id = s.attendance_status_id
    WHERE 
      a.userId = ?;
  `;

  db.query(queryGetAttendanceByUserId, [id], (err, result) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "No attendance records found for this user" });
    }

    const formattedResult = result.map((record) => {
      const attendanceDate = new Date(record.attendance_date);
      const checkInTime = record.check_in_time
        ? new Date(record.check_in_time)
        : null;
      const checkOutTime = record.check_out_time
        ? new Date(record.check_out_time)
        : null;

      const formattedAttendanceDate = attendanceDate
        .getDate()
        .toString()
        .padStart(2, "0");

      const formattedAttendanceMonthYear = `${attendanceDate.toLocaleString(
        "en-EN",
        { month: "short" }
      )} ${attendanceDate.getFullYear()}`;

      return {
        attendanceId: record.attendanceId,
        userId: record.userId,
        attendance_category: record.attendance_category,
        attendance_status: record.attendance_status,
        attendance_date: formattedAttendanceDate,
        attendance_month_year: formattedAttendanceMonthYear,
        check_in_time: checkInTime
          ? checkInTime.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        check_out_time: checkOutTime
          ? checkOutTime.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        latitude: record.latitude,
        longitude: record.longitude,
        upload_image: record.upload_image,
        notes: record.notes,
      };
    });

    res.json(formattedResult);
  });
};

module.exports = {
  register,
  insertUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getAttendanceByUserId,
};
