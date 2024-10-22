const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { infinite_track_connection: db } = require("../dbconfig.js");

// Insert User Function
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

// Update User Function
const updateUser = (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, password, role } = req.body;

  const queryFindRoleId = "SELECT roleId FROM roles WHERE role = ?";

  db.query(queryFindRoleId, [role], (err, roleResult) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (roleResult.length === 0) {
      return res.status(400).json({ message: "Role not found" });
    }

    const roleId = roleResult[0].roleId; // Get roleId from query result
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
          hashedPassword = hash; // Set the hashed password
          updateUserInDb();
        });
      });
    } else {
      updateUserInDb(); // If no password is provided, skip hashing
    }

    function updateUserInDb() {
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

// Get User By ID Function
const getUserById = (req, res) => {
  const id = parseInt(req.params.id);

  const queryGetUserById = "SELECT * FROM users WHERE id = ?";
  db.query(queryGetUserById, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result[0]);
  });
};

module.exports = {
  insertUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
};
