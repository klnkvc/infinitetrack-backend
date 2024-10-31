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

    // Validasi input wajib
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

    // Cek apakah user sudah ada berdasarkan email
    const existingUser = await queryAsync(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Proses role
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

    // Jika user adalah head program, hanya butuh program
    if (isHeadProgram) {
      // Proses program
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
    }
    // Jika user bukan head program, proses division dan program
    else if (is_hasDivision && is_hasProgram) {
      // Proses program
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

      // Proses division
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

    // Proses position
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

    // Insert user baru
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

// Fungsi insertUser
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

  // Cek apakah pengguna ada di database
  const queryGetUser =
    "SELECT nip_nim, address, start_contract, end_contract FROM users WHERE userId = ?";
  db.query(queryGetUser, [userId], (err, userResult) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    const existingUserData = userResult[0];

    if (
      existingUserData.nip_nim &&
      existingUserData.address &&
      existingUserData.start_contract &&
      existingUserData.end_contract
    ) {
      if (
        nip_nim !== existingUserData.nip_nim ||
        address !== existingUserData.address ||
        start_contract !== existingUserData.start_contract ||
        end_contract !== existingUserData.end_contract
      ) {
        const queryUpdateUser = `UPDATE users SET phone_number = ? WHERE userId = ?`;

        db.query(queryUpdateUser, [phone_number, userId], (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database error", error: err });
          }

          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ message: "User not found or no changes made." });
          }
        });

        return res.status(201).json({
          message:
            "You cannot update nip_nim, address, start_contract, or end_contract as they already exist. Phone Number Updated",
        });
      }
    }
  });
};

// Delete User Function
const deleteUser = (req, res) => {
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
};

// Get All Users Function
const getAllUsers = (req, res) => {
  const queryGetAllUsers = "SELECT * FROM users";
  db.query(queryGetAllUsers, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(result);
  });
};

// // Get User By ID Function
// const getUserById = (req, res) => {
//   const id = parseInt(req.params.id);

//   const queryGetUserById = "SELECT * FROM users WHERE userId = ?";
//   db.query(queryGetUserById, [id], (err, result) => {
//     if (err) {
//       return res.status(500).json({ message: "Database error", error: err });
//     }
//     if (result.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.json(result[0]);
//   });
// };

// Get User By ID Function
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

    // Ambil hasil dan hapus userId dari hasil
    const user = {
      name: result[0].name,
      divisionId: result[0].divisionId,
      division: result[0].division,
      headprogram: result[0].headprogram,
    };

    res.json(user);
  });
};

module.exports = {
  register,
  insertUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
};
