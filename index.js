const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { verifyToken, checkRole } = require("./middleware/authMiddleWare.js");
const { infinite_track_connection: db } = require("./dbconfig.js"); // Import koneksi ke database
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Array simulasi data user
let users = [];

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
