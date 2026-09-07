const sessionService = require("../services/session.service");

const createSession = async (req, res) => {
  try {
    const {
      studentId,
      topic,
      scheduledAt,
    } = req.body;

    if (!studentId || !topic || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message:
          "Student, topic and scheduled time are required",
      });
    }

    const session = await sessionService.createSession({
      tutorId: req.user.id,
      studentId,
      topic,
      scheduledAt,
    });

    res.status(201).json({
      success: true,
      message: "Session scheduled successfully",
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

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const session =
      await sessionService.updateSessionStatus(
        id,
        status,
        req.user.id
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

const getSessions = async (req, res) => {
  try {
    const sessions =
      await sessionService.getSessionsByTutor(req.user.id);

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


const generatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const session =
      await sessionService.generatePlan(
        id,
        req.user.id
      );

    res.status(200).json({
      success: true,
      message: "AI session plan generated successfully",
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


const updateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string",
      });
    }

    const session =
      await sessionService.updateSessionNotes(
        id,
        req.user.id,
        notes
      );

    res.status(200).json({
      success: true,
      message: "Notes saved successfully",
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



const generateReview = async (req, res) => {
  try {
    const { id } = req.params;

    const session =
      await sessionService.generateReview(
        id,
        req.user.id
      );

    res.status(200).json({
      success: true,
      message: "AI session review generated successfully",
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
  createSession,
  updateStatus,
  getSessions,
  generatePlan,
  updateNotes,
  generateReview,
};