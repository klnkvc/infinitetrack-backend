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

function getHeadProgramIdByheadProgram(headprogram, callback) {
  const query =
    "SELECT headprogramId FROM head_program WHERE headprogram = ? LIMIT 1";
  db.query(query, [headprogram], (err, result) => {
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

function insertLeaveRequest(data, callback) {
  const leavestatusId = data.leavestatusId || 1;
  const query = `INSERT INTO leave_users 
    (userId, headprogramId, divisionId, start_date, end_date, leavetypeId, description, phone, address, upload_image, leavestatusId) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(
    query,
    [
      data.userId,
      data.headprogramId,
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
}

function handleLeaveRequest(req, res) {
  const {
    name,
    headprogram,
    division,
    start_date,
    end_date,
    leavetype,
    description,
    phone,
    address,
  } = req.body;

  const upload_image = req.file ? req.file.filename : null;

  if (
    !name ||
    !headprogram ||
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
    if (err) return res.status(500).json({ message: err.message });

    getHeadProgramIdByheadProgram(headprogram, (err, headprogramId) => {
      if (err) return res.status(500).json({ message: err.message });

      getDivisionIdByDivision(division, (err, divisionId) => {
        if (err) return res.status(500).json({ message: err.message });

        getLeavetypeIdByLeaveType(leavetype, (err, leavetypeId) => {
          if (err) return res.status(500).json({ message: err.message });

          insertLeaveRequest(
            {
              userId,
              headprogramId,
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
              if (err) return res.status(500).json({ message: "DB Error" });

              res
                .status(201)
                .json({ message: "Leave request submitted successfully" });
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
