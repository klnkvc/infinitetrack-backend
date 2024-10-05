const jwt = require("jsonwebtoken");

// Middleware untuk memverifikasi token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Ambil token dari header
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied, No Token Provided" });
  }

  try {
    // Verifikasi token dengan secret key dari .env
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Menyimpan data user dari token
    next(); // Lanjut ke middleware berikutnya
  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

// Middleware untuk mengecek role
const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access Forbidden" });
  }
  next();
};

module.exports = { verifyToken, checkRole };
