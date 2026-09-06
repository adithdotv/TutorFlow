const sessionService = require("../services/session.service");

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const session = await sessionService.updateSessionStatus(
      id,
      status
    );

    res.status(200).json({
      success: true,
      session,
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
  updateStatus,
};