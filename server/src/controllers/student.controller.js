const studentService = require("../services/student.service");

const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      subject,
      currentLevel,
      learningGoals,
      weakAreas,
    } = req.body;

    // Basic validation
    if (!name || !email || !password || !subject) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and subject are required",
      });
    }

    const result = await studentService.createStudent({
      name,
      email,
      password,
      subject,
      currentLevel,
      learningGoals,
      weakAreas,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      ...result,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createStudent,
};