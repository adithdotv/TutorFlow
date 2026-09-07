const progressService = require(
  "../services/progress.service"
);


const getProgress = async (req, res) => {
  try {
    const { studentId } = req.params;

    const progress =
      await progressService.getStudentProgress(
        studentId,
        req.user.id
      );

    res.status(200).json({
      success: true,
      ...progress,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};


const generateInsights = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result =
      await progressService.generateProgressInsights(
        studentId,
        req.user.id
      );

    res.status(200).json({
      success: true,
      message:
        "Progress insights generated successfully",
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
  getProgress,
  generateInsights,
};