const { infinite_track_connection: db } = require("../dbconfig.js");
const fs = require("fs");

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

function checkAnnualUsage(userId, callback) {
  const query = `
    SELECT leavebalanceId, annual_used, annual_balance 
    FROM leave_balance 
    WHERE userId = ? 
    LIMIT 1
  `;

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching Leave Balance: ", err.message);
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(new Error("Leave Balance not found"), null);
    }

    const leavebalanceId = result[0].leavebalanceId;
    const annual_used = result[0].annual_used;
    const annual_balance = result[0].annual_balance;

    callback(null, { leavebalanceId, annual_used, annual_balance });
  });
}

function updateAnnualUsed(userId, startDate, endDate, callback) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const query = `UPDATE leave_balance SET annual_used = annual_used + ? WHERE userId = ?`;

  db.query(query, [diffDays, userId], (err, result) => {
    if (err) {
      console.error("Error updating annual leave balance:", err.message);
      return callback(err);
    }

    callback(null, result);
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
    if (upload_image) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Error deleting the file:", err);
        }
      });
    }
    return res.status(400).json({ message: "All fields are required" });
  }

  getUserIdByName(name, (err, userId) => {
    if (err) {
      if (upload_image) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting the file:", err);
        });
      }
      return res.status(500).json({ message: err.message });
    }

    getProgramIdByProgramName(programName, (err, programId) => {
      if (err) {
        if (upload_image) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting the file:", err);
          });
        }
        return res.status(500).json({ message: err.message });
      }

      getDivisionIdByDivision(division, (err, divisionId) => {
        if (err) {
          if (upload_image) {
            fs.unlink(req.file.path, (err) => {
              if (err) console.error("Error deleting the file:", err);
            });
          }
          return res.status(500).json({ message: err.message });
        }

        getLeavetypeIdByLeaveType(leavetype, (err, leavetypeId) => {
          if (err) {
            if (upload_image) {
              fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting the file:", err);
              });
            }
            return res.status(500).json({ message: err.message });
          }

          if (leavetypeId === 4) {
            checkAnnualUsage(userId, (err, leaveBalance) => {
              if (err) {
                if (upload_image) {
                  fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Error deleting the file:", err);
                  });
                }
                return res
                  .status(500)
                  .json({ message: "Error checking leave balance" });
              }

              const { annual_used, annual_balance } = leaveBalance;
              const start = new Date(start_date);
              const end = new Date(end_date);
              const diffTime = Math.abs(end - start);
              const daysRequested =
                Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

              if (annual_used + daysRequested > annual_balance) {
                if (upload_image) {
                  fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Error deleting the file:", err);
                  });
                }
                return res.status(400).json({
                  message:
                    "You Have Reached Your Annual Limit. Leave Rejected. Please Wait for New Annual Leave :D",
                });
              }

              updateAnnualUsed(userId, start_date, end_date, (err) => {
                if (err) {
                  if (upload_image) {
                    fs.unlink(req.file.path, (err) => {
                      if (err) console.error("Error deleting the file:", err);
                    });
                  }
                  return res
                    .status(500)
                    .json({ message: "Error updating leave balance" });
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

                    return res.status(201).json({
                      message:
                        "Leave request submitted successfully, annual leave balance updated",
                    });
                  }
                );
              });
            });
          } else {
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

                res.status(201).json({
                  message: "Leave request submitted successfully",
                });
              }
            );
          }
        });
      });
    });
  });
}

function insertLeaveRequest(data, callback) {
  const leavestatusId = data.leavestatusId || 1;

  getHeadProgramIdByProgramId(data.programId, (err, headprogramId) => {
    if (err) {
      return res.status(500).json({ message: err.message });
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

function getAllLeaveUsers(req, res) {
  const query = `
    SELECT lu.leaveId, lu.userId, u.name AS userName, lu.start_date, lu.end_date, 
           lt.leavetype AS leaveType, lu.description, lu.phone, lu.address, 
           lu.upload_image, lu.leavestatusId, ls.leaveStatus AS leaveStatus
    FROM leave_users lu
    JOIN users u ON lu.userId = u.userId
    JOIN leave_type lt ON lu.leavetypeId = lt.leavetypeId
    JOIN leave_status ls ON lu.leavestatusId = ls.leavestatusId
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching leave users data:", err.message);
      return res
        .status(500)
        .json({ message: "Error fetching leave users data" });
    }

    res.status(200).json({ data: result });
  });
}

function approveByHeadProgram(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body; // approvalStatus akan berupa "approved" atau "declined"

  // Cek apakah approvalStatus adalah "approved" atau "declined"
  if (approvalStatus === "approved") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 2,       -- status 'Approved by HeadProgram'
          approverId = 2           -- ID dari HeadProgram yang menyetujui
      WHERE leaveId = ? AND leavestatusId = 1
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error approving by HeadProgram:", err.message);
        return res
          .status(500)
          .json({ message: "Approval error by HeadProgram" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message:
            "Leave request not found or already processed by HeadProgram",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request approved by HeadProgram" });
    });
  } else if (approvalStatus === "declined") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 5,       -- status 'Declined'
          approverId = 1           -- ID tetap pada HeadProgram yang menolak
      WHERE leaveId = ? AND leavestatusId = 1
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error declining by HeadProgram:", err.message);
        return res
          .status(500)
          .json({ message: "Decline error by HeadProgram" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message:
            "Leave request not found or already processed by HeadProgram",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request declined by HeadProgram" });
    });
  } else {
    // Jika approvalStatus tidak valid
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

function approveByOperational(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body; // "approved" atau "declined"

  if (approvalStatus === "approved") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 3,  -- status 'Approved by Operational'
        approverId = 3           
      WHERE leaveId = ? AND leavestatusId = 2
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error approving by Operational:", err.message);
        return res
          .status(500)
          .json({ message: "Approval error by Operational" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Leave request not found or not yet approved by HeadProgram",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request approved by Operational" });
    });
  } else if (approvalStatus === "declined") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 5,       -- status 'Declined'
          approverId = 2           -- ID tetap pada HeadProgram yang menolak
      WHERE leaveId = ? AND leavestatusId = 2
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error declining by Operational:", err.message);
        return res
          .status(500)
          .json({ message: "Decline error by Operational" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Leave request not found or not yet approved by HeadProgram",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request declined by Operational" });
    });
  } else {
    // Jika approvalStatus tidak valid
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

function approveByProgramDirector(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body; // "approved" atau "declined"

  if (approvalStatus === "approved") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 4  -- status 'Approved by Program Director'
      WHERE leaveId = ? AND leavestatusId = 3
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error approving by Program Director:", err.message);
        return res
          .status(500)
          .json({ message: "Approval error by Program Director" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Leave request not found or not yet approved by Operational",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request approved by Program Director" });
    });
  } else if (approvalStatus === "declined") {
    const query = `
      UPDATE leave_users 
      SET leavestatusId = 5  -- status 'Declined'
      WHERE leaveId = ? AND leavestatusId = 3
    `;

    db.query(query, [leaveId], (err, result) => {
      if (err) {
        console.error("Error declining by Program Director:", err.message);
        return res
          .status(500)
          .json({ message: "Decline error by Program Director" });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({
          message: "Leave request not found or not yet approved by Operational",
        });
      }

      res
        .status(200)
        .json({ message: "Leave request declined by Program Director" });
    });
  } else {
    // Jika approvalStatus tidak valid
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

module.exports = {
  handleLeaveRequest,
  getAllLeaveUsers,
  approveByHeadProgram,
  approveByOperational,
  approveByProgramDirector,
};
