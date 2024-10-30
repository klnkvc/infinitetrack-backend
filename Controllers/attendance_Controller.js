const { infinite_track_connection: db } = require("../dbconfig");
const { haversineDistance } = require("../utils/geofence");

const getAttendanceCategoryId = (category) => {
  return category === "Work From Office" ? 1 : 2; // 1 untuk WFO, 2 untuk WFH
};

// Fungsi untuk mendapatkan ID status absensi
const getAttendanceStatusId = (status) => {
  return status === "late" ? 1 : 2; // 1 untuk Late, 2 untuk Confirm
};

// lokasi kantor
const officeLocation = {
  latitude: 1.1853258302684722,
  longitude: 104.10194910214162,
};

const handleAttendance = (req, res) => {
  const { attendance_category, action } = req.body;
  let { latitude, longitude } = req.body;
  const attendance_category_id = getAttendanceCategoryId(attendance_category);
  const userId = req.user.id;

  let upload_image = null;
  const now = new Date();
  const currentHour = now.getHours();
  let attendance_status_id;

  if (action === "checkin") {
    // Handle Check-In Logic
    if (attendance_category_id === 2) {
      // Validasi untuk Work From Home (WFO)
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Image is required for Work From Home" });
      }
      upload_image = req.file.path;
      latitude = null;
      longitude = null;
    } else {
      // Validasi geofence (radius dalam meter)
      const allowedRadius = 125; // 125 meter
      const userLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };

      const distance = haversineDistance(officeLocation, userLocation);
      if (distance > allowedRadius) {
        return res
          .status(400)
          .json({ message: "Location out of allowed radius" });
      }
      upload_image = "";
    }

    attendance_status_id = currentHour < 9 ? 1 : 2; // Check for lateness

    db.query(
      "INSERT INTO attendance (check_in_time, check_out_time, userId, attendance_category_id, attendance_status_id, attendance_date, latitude, longitude, upload_image) VALUES (NOW(), NULL, ?, ?, ?, CURDATE(), ?, ?, ?)",
      [
        userId,
        attendance_category_id,
        attendance_status_id,
        latitude,
        longitude,
        upload_image,
      ],
      (err, result) => {
        if (err) {
          console.error("Error during check-in:", err.message);
          return res.status(500).json({ message: "Failed to check in" });
        }

        const attendanceId = result.insertId;

        const queryAttendanceDetails = `
          SELECT a.attendance_date, s.attendance_status AS attendance_status
          FROM attendance a
          JOIN attendance_status s ON a.attendance_status_id = s.attendance_status_id
          WHERE a.attendanceId = ?
        `;

        db.query(
          queryAttendanceDetails,
          [attendanceId],
          (err, detailsResult) => {
            if (err) {
              console.error(
                "Error retrieving attendance details:",
                err.message
              );
              return res
                .status(500)
                .json({ message: "Failed to retrieve attendance details" });
            }

            res.status(200).json({
              message: "Check-in successful",
              attendanceId,
              attendance_status: detailsResult[0].attendance_status,
            });
          }
        );
      }
    );
  } else if (action === "checkout") {
    // Handle Check-Out Logic
    attendance_status_id = currentHour > 17 ? 3 : 1; // 3 untuk overtime, 1 untuk normal

    db.query(
      "UPDATE attendance SET check_out_time = NOW(), attendance_status_id = ? WHERE userId = ? AND attendance_date = CURDATE() AND check_out_time IS NULL",
      [attendance_status_id, userId],
      (err, result) => {
        if (err) {
          console.error("Error during check-out:", err.message);
          return res.status(500).json({ message: "Failed to check out" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(400)
            .json({ message: "No active check-in found for today" });
        }

        res.status(200).json({ message: "Check-out successful" });
      }
    );
  } else {
    res.status(400).json({ message: "Invalid action" });
  }
};

module.exports = {
  handleAttendance,
};
