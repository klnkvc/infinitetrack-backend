const { infinite_track_connection: db } = require("../dbconfig.js");

function getUserIdByName(name, callback) {
  const query = "SELECT userId FROM users WHERE name = ? LIMIT 1";

  db.query(query, [name], (err, result) => {
    if (err) {
      console.error("Error fetching userId:", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("User not found"), null);
    }

    const userId = result[0].userId;
    callback(null, userId);
  });
}

function getProgramIdByProgramName(programName, callback) {
  const query = "SELECT programId FROM programs WHERE programName = ? LIMIT 1";

  db.query(query, [programName], (err, result) => {
    if (err) {
      console.error("Error fetching programId:", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("Program not found"), null);
    }

    const programId = result[0].programId;
    callback(null, programId);
  });
}

function getHeadProgramIdByProgramId(programId, callback) {
  const query =
    "SELECT headprogramId FROM head_program WHERE programId = ? LIMIT 1";

  db.query(query, [programId], (err, result) => {
    if (err) {
      console.error("Error fetching headprogramId:", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("Headprogram not found"), null);
    }

    const headprogramId = result[0].headprogramId;
    callback(null, headprogramId);
  });
}

function getDivisionIdByDivision(division, callback) {
  const query = "SELECT divisionId FROM divisions WHERE division = ? LIMIT 1";

  db.query(query, [division], (err, result) => {
    if (err) {
      console.error("Error fetching divisionId:", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("Division not found"), null);
    }

    const divisionId = result[0].divisionId;
    callback(null, divisionId);
  });
}

function getLeavetypeIdByLeaveType(leavetype, callback) {
  const query =
    "SELECT leavetypeId FROM leave_type WHERE leavetype = ? LIMIT 1";

  db.query(query, [leavetype], (err, result) => {
    if (err) {
      console.error("Error fetching leavetypeId:", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("Leave Type not found"), null);
    }

    const leavetypeId = result[0].leavetypeId;
    callback(null, leavetypeId);
  });
}

function updateAnnualUsed(userId, startDate, endDate, callback) {
  // Hitung selisih hari antara start_date dan end_date
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Menghitung jumlah hari antara start_date dan end_date
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Tambahkan 1 agar inklusif

  const query = `UPDATE leave_balance SET annual_used = annual_used + ? WHERE userId = ?`;

  db.query(query, [diffDays, userId], (err, result) => {
    if (err) {
      console.error("Error updating annual leave balance:", err.message);
      return callback(err);
    }

    callback(null, result);
  });
}

function insertLeaveRequest(data, callback) {
  const leavestatusId = data.leavestatusId || 1;

  getHeadProgramIdByProgramId(data.programId, (err, headprogramId) => {
    if (err) {
      return callback(err);
    }

    const query = `INSERT INTO leave_users 
    (userId, headprogramId, divisionId, start_date, end_date, leavetypeId, description, phone, address, upload_image, leavestatusId) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
      query,
      [
        data.userId,
        headprogramId,
        data.divisionId,
        data.start_date,
        data.end_date,
        data.leavetypeId,
        data.description,
        data.phone,
        data.address,
        data.upload_image,
        leavestatusId,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting leave request:", err.message);
          return callback(err, null);
        }

        callback(null, result);
      }
    );
  });
}

function handleLeaveRequest(req, res) {
  const {
    name,
    programName,
    division,
    start_date,
    end_date,
    leavetype,
    description,
    phone,
    address,
  } = req.body;

  const upload_image = req.file ? req.file.filename : null;

  // Log untuk debugging
  console.log("Request Body:", req.body);
  console.log("Uploaded File:", req.file);

  // Validasi input
  if (
    !name ||
    !programName ||
    !division ||
    !start_date ||
    !end_date ||
    !leavetype ||
    !description ||
    !phone ||
    !address ||
    !upload_image
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  getUserIdByName(name, (err, userId) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    getProgramIdByProgramName(programName, (err, programId) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      getDivisionIdByDivision(division, (err, divisionId) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        getLeavetypeIdByLeaveType(leavetype, (err, leavetypeId) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }

          insertLeaveRequest(
            {
              userId,
              programId,
              divisionId,
              start_date,
              end_date,
              leavetypeId,
              description,
              phone,
              address,
              upload_image,
            },
            (err, result) => {
              if (err) {
                return res.status(500).json({ message: "DB Error" });
              }

              if (leavetypeId === 4) {
                updateAnnualUsed(userId, start_date, end_date, (err) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ message: "Error updating leave balance" });
                  }

                  return res.status(201).json({
                    message:
                      "Leave request submitted successfully, annual leave balance updated",
                  });
                });
              } else {
                return res.status(201).json({
                  message: "Leave request submitted successfully",
                });
              }
            }
          );
        });
      });
    });
  });
}

module.exports = {
  handleLeaveRequest,
};
