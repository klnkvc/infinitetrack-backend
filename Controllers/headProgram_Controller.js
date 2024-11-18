const { infinite_track_connection: db } = require("../dbconfig.js");

const insertHeadProgram = (headprogram) => {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO head_program (headprogram) VALUES (?)",
      [headprogram],
      (err, result) => {
        if (err) {
          console.error("Error inserting headprogram:", err.message);
          return reject(err);
        }
        resolve(result.insertId);
      }
    );
  });
};

const getAllHeadPrograms = (req, res) => {
  const queryHeadPrograms = "SELECT * FROM head_program";

  db.query(queryHeadPrograms, (err, headProgramsResult) => {
    if (err) {
      console.error("Error retrieving head programs:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (headProgramsResult.length === 0) {
      return res.status(404).json({ message: "No head programs found" });
    }

    const headProgramsWithDetails = headProgramsResult.map((headProgram) => {
      const userId = headProgram.userId;
      const programId = headProgram.programId;

      return new Promise((resolve, reject) => {
        const queryUserName = "SELECT name FROM users WHERE userId = ?";
        db.query(queryUserName, [userId], (err, userResult) => {
          if (err) {
            console.error("Error retrieving user name:", err.message);
            return reject(err);
          }

          const headprogramName = userResult.length
            ? userResult[0].name
            : "User not found";

          const queryProgramName =
            "SELECT programName FROM programs WHERE programId = ?";
          db.query(queryProgramName, [programId], (err, programResult) => {
            if (err) {
              console.error("Error retrieving program name:", err.message);
              return reject(err);
            }

            const programName = programResult.length
              ? programResult[0].programName
              : "Program not found";

            resolve({
              headprogramId: headProgram.headprogramId,
              headprogramName: headprogramName,
              programName: programName,
            });
          });
        });
      });
    });

    Promise.all(headProgramsWithDetails)
      .then((results) => res.status(200).json(results))
      .catch((error) =>
        res
          .status(500)
          .json({ message: "Database Error", error: error.message })
      );
  });
};

const getHeadProgramById = (req, res) => {
  const headprogramId = req.params.headprogramId;

  const queryHeadProgram = "SELECT * FROM head_program WHERE headprogramId = ?";
  db.query(queryHeadProgram, [headprogramId], (err, headProgramResult) => {
    if (err) {
      console.error("Error retrieving headprogram:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (headProgramResult.length === 0) {
      return res.status(404).json({ message: "Headprogram not found" });
    }

    const headProgram = headProgramResult[0];
    const userId = headProgram.userId;

    const queryUserName = "SELECT name FROM users WHERE userId = ?";
    db.query(queryUserName, [userId], (err, userResult) => {
      if (err) {
        console.error("Error retrieving user name:", err.message);
        return res.status(500).json({ message: "Database Error", error: err });
      }

      if (userResult.length === 0) {
        return res
          .status(404)
          .json({ message: "User not found for the headprogram" });
      }

      const response = {
        headprogramName: userResult[0].name,
      };

      res.status(200).json(response);
    });
  });
};

module.exports = { getHeadProgramById, getAllHeadPrograms };
