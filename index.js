const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { verifyToken, checkRole } = require("./middleware/authMiddleWare.js");

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

  // Cek apakah semua data diperlukan ada
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Cek apakah pengguna sudah terdaftar
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  try {
    // Enkripsi password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Buat pengguna baru
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role, // Role could be 'intern', 'karyawan', or 'manajemen'
    };
    users.push(newUser);

    // Buat token setelah pendaftaran sukses
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Kirim respon dengan user baru dan token
    res.status(201).json({ user: newUser, token });
  } catch (error) {
    // Tangani kesalahan hashing
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Login user
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user)
    return res.status(400).json({ message: "Email or password is wrong" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid password" });

  // Buat token setelah validasi sukses
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

// Get all users
app.get("/users", (req, res) => {
  res.json(users);
});

// Get user by ID
app.get("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find((u) => u.id === id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).send("User not found");
  }
});

// Create new user
app.post("/users", (req, res) => {
  const newUser = { id: users.length + 1, ...req.body };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Update user
app.put("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex((u) => u.id === id);
  if (index !== -1) {
    users[index] = { id, ...req.body };
    res.json(users[index]);
  } else {
    res.status(404).send("User not found");
  }
});

// Delete user
app.delete("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex((u) => u.id === id);
  if (index !== -1) {
    const deletedUser = users.splice(index, 1);
    res.json(deletedUser);
  } else {
    res.status(404).send("User not found");
  }
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
