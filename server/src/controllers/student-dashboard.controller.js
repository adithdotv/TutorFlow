const studentDashboardService = require(
  "../services/student-dashboard.service"
);

const getProfile = async (req, res) => {
  try {
    const profile =
      await studentDashboardService.getProfile(
        req.user.id
      );

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getSessions = async (req, res) => {
  try {
    const sessions =
      await studentDashboardService.getSessions(
        req.user.id
      );

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session =
      await studentDashboardService.getSessionById(
        id,
        req.user.id
      );

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error(error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getProfile,
  getSessions,
  getSessionById,
};