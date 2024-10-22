// controllers/headProgram_Controller.js
const { infinite_track_connection: db } = require("../dbconfig.js");

// Function to insert headprogram into the database
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
        resolve(result.insertId); // Return the newly inserted headprogram ID
      }
    );
  });
};

// Controller method to create a new headprogram
const createHeadProgram = async (req, res) => {
  const { headprogram } = req.body;

  // Input validation
  if (!headprogram) {
    return res.status(400).json({ message: "Headprogram Input is required" });
  }

  try {
    const headprogramId = await insertHeadProgram(headprogram);
    res.status(201).json({
      message: "Headprogram created successfully",
      headprogramId,
      headprogram,
    });
  } catch (err) {
    res.status(500).json({ message: "Database Error", error: err });
  }
};

// Controller method to get headprogram by ID
const getHeadProgramById = (req, res) => {
  const headprogramId = req.params.headprogramId;

  // Query to fetch headprogram by ID
  const query = "SELECT * FROM head_program WHERE headprogramId = ?";
  db.query(query, [headprogramId], (err, result) => {
    if (err) {
      console.error("Error retrieving headprogram:", err.message);
      return res.status(500).json({ message: "Database Error", error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Headprogram not found" });
    }

    // Return the fetched headprogram
    res.status(200).json(result[0]);
  });
};

module.exports = { createHeadProgram, getHeadProgramById };
