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

function getProgramAndHeadProgramIdByHeadProgramName(
  headProgramName,
  callback
) {
  const query = `
   SELECT
     hp.headprogramId,
     hp.programId
   FROM
     users u
   INNER JOIN
     head_program hp ON u.userId = hp.userId
   WHERE
     u.name = ?;
 `;

  db.query(query, [headProgramName], (err, result) => {
    if (err) {
      console.error(
        "Error fetching program and head program IDs:",
        err.message
      );
      return callback(err, null);
    }

    if (result.length === 0) {
      return callback(
        new Error("No matching head program or program found"),
        null
      );
    }

    const { programId, headprogramId } = result[0];
    callback(null, { programId, headprogramId });
    console.log("Query result:", result);
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
    headProgramName,
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
    !headProgramName ||
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

    getProgramAndHeadProgramIdByHeadProgramName(
      headProgramName,
      (err, programAndHeadProgram) => {
        if (err) {
          if (upload_image) {
            fs.unlink(req.file.path, (err) => {
              if (err) console.error("Error deleting the file:", err);
            });
          }
          return res.status(500).json({ message: err.message });
        }

        const { programId, headprogramId } = programAndHeadProgram;

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
      }
    );
  });
}

function insertLeaveRequest(data, callback) {
  const leavestatusId = data.leavestatusId || 1;

  // getHeadProgramIdByProgramId(data.programId, (err, headprogramId) => {
  //   if (err) {
  //     return res.status(500).json({ message: err.message });
  //   }

  //   const query = `INSERT INTO leave_users
  //   (userId, headprogramId, divisionId, start_date, end_date, leavetypeId, description, phone, address, upload_image, leavestatusId)
  //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  //   db.query(
  //     query,
  //     [
  //       data.userId,
  //       headprogramId,
  //       data.divisionId,
  //       data.start_date,
  //       data.end_date,
  //       data.leavetypeId,
  //       data.description,
  //       data.phone,
  //       data.address,
  //       data.upload_image,
  //       leavestatusId,
  //     ],
  //     (err, result) => {
  //       if (err) {
  //         console.error("Error inserting leave request:", err.message);
  //         return callback(err, null);
  //       }

  //       callback(null, result);
  //     }
  //   );
  // });

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

function getAllLeaveUsers(req, res) {
  const query = `
   SELECT u.name AS userName, u.profile_photo, d.division, lu.start_date, lu.end_date, lu.submitted_at
   FROM leave_users lu
   JOIN users u ON lu.userId = u.userId
   JOIN divisions d ON u.divisionId = d.divisionId
 `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching leave users data:", err.message);
      return res
        .status(500)
        .json({ message: "Error fetching leave users data" });
    }

    const formatDateTime = (dateTime) => {
      const date = new Date(dateTime);
      const day = String(date.getDate()).padStart(2, "0");

      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    };

    const formatTimeAgo = (submittedAt) => {
      const now = new Date();
      const submittedDate = new Date(submittedAt);
      const diffInSeconds = Math.floor((now - submittedDate) / 1000);
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
      } else if (diffInDays === 1) {
        return "One day ago";
      } else {
        return `${diffInDays} days ago`;
      }
    };

    const formattedResult = result.map((item) => ({
      userName: item.userName,
      profile_photo: item.profile_photo,
      division: item.division,
      start_date: formatDateTime(item.start_date),
      end_date: formatDateTime(item.end_date),
      submitted_at: formatTimeAgo(item.submitted_at),
    }));

    res.status(200).json({ data: formattedResult });
  });
}

function approveByHeadProgram(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body;

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
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

function approveByOperational(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body;

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
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

function approveByProgramDirector(req, res) {
  const { leaveId } = req.params;
  const { approvalStatus } = req.body;

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
    res.status(400).json({
      message: "Invalid approval status. Must be 'approved' or 'declined'.",
    });
  }
}

function getAssignedLeaveRequests(req, res) {
  const { role } = req.params;

  let statusId;
  switch (role.toLowerCase()) {
    case "headprogram":
      statusId = 1;
      break;
    case "operational":
      statusId = 2;
      break;
    case "programdirector":
      statusId = 3;
      break;
    default:
      return res.status(400).json({ message: "Invalid role" });
  }

  const query = `
   SELECT
     lu.leaveId,
     u.name AS userName,                 -- Nama user yang mengajukan leave
     lb.annual_used,                     -- Jumlah cuti terpakai dari tabel leave_balance
     lb.annual_balance,                  -- Jumlah total cuti dari tabel leave_balance
     lu.submitted_at,
     ls.leavestatus,                     -- Status cuti dari tabel leave_status
     lt.leavetype AS leavetype               -- Nama leave type dari tabel leave_type
   FROM leave_users lu
   INNER JOIN users u ON lu.userId = u.userId
   INNER JOIN leave_type lt ON lu.leavetypeId = lt.leavetypeId
   INNER JOIN leave_balance lb ON lu.userId = lb.userId
   INNER JOIN leave_status ls ON lu.leavestatusId = ls.leavestatusId
   WHERE lu.leavestatusId = ?
 `;

  db.query(query, [statusId], (err, results) => {
    if (err) {
      console.error("Error fetching assigned leave requests:", err.message);
      return res
        .status(500)
        .json({ message: "Error fetching assigned leave requests" });
    }

    if (results.length === 0) {
      return res.status(200).json({ message: "empty" });
    }

    const formattedResults = results.map((item) => ({
      ...item,
      submitted_at: new Date(item.submitted_at)
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/,([^\s])/, ", $1"),
    }));

    res.status(200).json(formattedResults);
  });
}

function getDeclinedLeaveRequests(req, res) {
  const { role } = req.params;

  const validRoles = ["headprogram", "operational", "programdirector"];
  if (!validRoles.includes(role.toLowerCase())) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const statusId = 5;

  const query = `
   SELECT
     lu.leaveId,
     u.name AS userName,                 -- Nama user yang mengajukan leave
     lb.annual_used,                     -- Jumlah cuti terpakai dari tabel leave_balance
     lb.annual_balance,                  -- Jumlah total cuti dari tabel leave_balance
     lu.submitted_at,
     ls.leavestatus,                     -- Status cuti dari tabel leave_status
     lt.leavetype AS leavetype               -- Nama leave type dari tabel leave_type
   FROM leave_users lu
   INNER JOIN users u ON lu.userId = u.userId
   INNER JOIN leave_type lt ON lu.leavetypeId = lt.leavetypeId
   INNER JOIN leave_balance lb ON lu.userId = lb.userId
   INNER JOIN leave_status ls ON lu.leavestatusId = ls.leavestatusId
   WHERE lu.leavestatusId = ?
 `;

  db.query(query, [statusId], (err, results) => {
    if (err) {
      console.error("Error fetching declined leave requests:", err.message);
      return res
        .status(500)
        .json({ message: "Error fetching declined leave requests" });
    }

    if (results.length === 0) {
      return res.status(200).json({ message: "empty" });
    }

    const formattedResults = results.map((item) => ({
      ...item,
      submitted_at: new Date(item.submitted_at)
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/,([^\s])/, ", $1"),
    }));

    res.status(200).json(formattedResults);
  });
}

function getApprovedLeaveRequests(req, res) {
  const { role } = req.params;

  let statusId;
  switch (role) {
    case "headprogram":
      statusId = 2;
      break;
    case "operational":
      statusId = 3;
      break;
    case "programdirector":
      statusId = 4;
      break;
    default:
      return res.status(400).json({ message: "Invalid role" });
  }

  const query = `
   SELECT
     lu.leaveId,
     u.name AS userName,                 -- Nama user yang mengajukan leave
     lb.annual_used,                     -- Jumlah cuti terpakai dari tabel leave_balance
     lb.annual_balance,                  -- Jumlah total cuti dari tabel leave_balance
     lu.submitted_at,
     ls.leavestatus,                     -- Status cuti dari tabel leave_status
     lt.leavetype AS leavetype               -- Nama leave type dari tabel leave_type
   FROM leave_users lu
   INNER JOIN users u ON lu.userId = u.userId
   INNER JOIN leave_type lt ON lu.leavetypeId = lt.leavetypeId
   INNER JOIN leave_balance lb ON lu.userId = lb.userId
   INNER JOIN leave_status ls ON lu.leavestatusId = ls.leavestatusId
   WHERE lu.leavestatusId = ?
 `;

  db.query(query, [statusId], (err, results) => {
    if (err) {
      console.error("Error fetching approved leave requests:", err.message);
      return res
        .status(500)
        .json({ message: "Error fetching approved leave requests" });
    }

    if (results.length === 0) {
      return res.status(200).json({ message: "empty" });
    }

    const formattedResults = results.map((item) => ({
      ...item,
      submitted_at: new Date(item.submitted_at)
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/,([^\s])/, ", $1"),
      leavestatus: item.leavestatus.replace(/Approved by .*/, "Approved"),
    }));

    res.status(200).json(formattedResults);
  });
}

module.exports = {
  handleLeaveRequest,
  getAllLeaveUsers,
  approveByHeadProgram,
  approveByOperational,
  approveByProgramDirector,
  getAssignedLeaveRequests,
  getDeclinedLeaveRequests,
  getApprovedLeaveRequests,
};
