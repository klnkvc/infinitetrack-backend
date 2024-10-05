const mysql = require("mysql2");
require("dotenv").config();

const infinite_track_connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.UNAME,
  port: process.env.DBPORT,
  password: process.env.PASSWORD,
  database: process.env.DB || "infinite_track", // Sesuaikan dengan nama database
});

module.exports = {
  infinite_track_connection,
};
