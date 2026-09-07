const sessionService = require("../services/session.service");

const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const parseScheduledAt = (value) => {
  if (typeof value !== "string") return null;
  if (!ISO_INSTANT.test(value)) return null;

  const scheduledAt = new Date(value);

  if (Number.isNaN(scheduledAt.getTime())) return null;

  return scheduledAt;
};

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

    const scheduledInstant = parseScheduledAt(scheduledAt);

    if (!scheduledInstant) {
      return res.status(400).json({
        success: false,
        message:
          "Scheduled time must be an ISO-8601 timestamp with a UTC offset",
      });
    }

    const session = await sessionService.createSession({
      tutorId: req.user.id,
      studentId,
      topic,
      scheduledAt: scheduledInstant,
    });

    res.status(201).json({
      success: true,
      message: "Session scheduled successfully",
      session,
    });
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 400).json({
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


const getSessionById = async (req, res) => {
  try {
    const session = await sessionService.getSessionById(
      req.params.id,
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
  getSessionById,
  generatePlan,
  updateNotes,
  generateReview,
};