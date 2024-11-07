const jwt = require("jsonwebtoken");
const { infinite_track_connection: db } = require("../dbconfig.js");

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied, No Token Provided" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;

    const queryFindRole = "SELECT * FROM roles WHERE roleId = ?";
    db.query(queryFindRole, [req.user.role], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }

      req.user.roleName = result[0].role;

      next();
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(400).json({ message: "Invalid Token" });
  }
};

const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.roleName)) {
    return res.status(403).json({ message: "Access Forbidden" });
  }
  next();
};

module.exports = { verifyToken, checkRole };
