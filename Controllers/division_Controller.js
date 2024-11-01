const { infinite_track_connection: db } = require("../dbconfig.js");

const getAllDivisions = (req, res) => {
  const queryDivisions = "SELECT * FROM divisions";

  db.query(queryDivisions, (err, divisionsResult) => {
    if (err) {
      console.error("Error retrieving divisions:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (divisionsResult.length === 0) {
      return res.status(404).json({ message: "No divisions found" });
    }

    const divisionsWithDetails = divisionsResult.map((division) => {
      const userId = division.userId;
      const programId = division.programId;

      return new Promise((resolve, reject) => {
        const queryUserName = "SELECT name FROM users WHERE userId = ?";
        db.query(queryUserName, [userId], (err, userResult) => {
          if (err) {
            console.error("Error retrieving user name:", err.message);
            return reject(err);
          }

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
              divisionId: division.divisionId,
              ...division,
              programName: programName,
            });
          });
        });
      });
    });

    Promise.all(divisionsWithDetails)
      .then((results) => res.status(200).json(results))
      .catch((error) =>
        res
          .status(500)
          .json({ message: "Database Error", error: error.message })
      );
  });
};

module.exports = { getAllDivisions };
