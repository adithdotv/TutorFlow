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

    if (!name || !email || !password || !subject) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and subject are required",
      });
    }

    const result = await studentService.createStudent({
      tutorId: req.user.id,
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

const getStudents = async (req, res) => {
  try {
    const students =
      await studentService.getStudentsByTutor(req.user.id);

    res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
};