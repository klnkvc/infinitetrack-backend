const jwt = require("jsonwebtoken");
const { infinite_track_connection: db } = require("../dbconfig.js");

// Middleware untuk memverifikasi token

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Ambil token dari header
  console.log("JWT Secret:", process.env.JWT_SECRET);
  console.log("Received Token:", token);
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied, No Token Provided" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Verified Token Payload:", verified);
    req.user = verified; // Menyimpan data user dari token (termasuk roleId)

    const queryFindRole = "SELECT * FROM roles WHERE roleId = ?";
    db.query(queryFindRole, [req.user.role], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }

      // Simpan role ke dalam req.user
      req.user.roleName = result[0].role; // Ambil nama role dan simpan sebagai roleName

      next(); // Lanjut ke middleware berikutnya
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(400).json({ message: "Invalid Token" });
  }
};

// Middleware untuk mengecek role
const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.roleName)) {
    return res.status(403).json({ message: "Access Forbidden" });
  }
  next();
};

module.exports = { verifyToken, checkRole };
