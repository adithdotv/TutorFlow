const pool = require("../config/db");
const aiService = require("./ai.service");

const getStudentProgress = async (studentId, tutorId) => {
  // Verify that the student belongs to this tutor
  const studentResult = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        sp.subject,
        sp.current_level,
        sp.learning_goals,
        sp.weak_areas
      FROM users u
      JOIN student_profiles sp
        ON sp.user_id = u.id
      WHERE u.id = $1
      AND u.role = 'student'
      AND sp.tutor_id = $2
    `,
    [studentId, tutorId]
  );

  if (studentResult.rows.length === 0) {
    throw new Error(
      "Student not found or does not belong to this tutor"
    );
  }

  const student = studentResult.rows[0];

  // Fetch every session for this student
  const sessionsResult = await pool.query(
    `
      SELECT
        id,
        topic,
        scheduled_at,
        status,
        notes,
        ai_review
      FROM sessions
      WHERE student_id = $1
      AND tutor_id = $2
      ORDER BY scheduled_at ASC
    `,
    [studentId, tutorId]
  );

  return {
    student,
    sessions: sessionsResult.rows,
  };
};


const generateProgressInsights = async (
  studentId,
  tutorId
) => {
  const { student, sessions } =
    await getStudentProgress(
      studentId,
      tutorId
    );

  // Only AI-reviewed sessions contain useful AI feedback
  const reviewedSessions = sessions.filter(
    (session) =>
      session.status === "AI_REVIEWED" &&
      session.ai_review
  );

  if (reviewedSessions.length === 0) {
    throw new Error(
      "No AI-reviewed sessions available for progress analysis"
    );
  }

  const reviews = reviewedSessions.map(
    (session, index) => ({
      sessionNumber: index + 1,
      topic: session.topic,
      scheduledAt: session.scheduled_at,
      review: session.ai_review,
    })
  );

  const insights =
    await aiService.generateProgressInsights({
      student,
      reviews,
    });

  return {
    student,
    insights,
    sessions,
  };
};


module.exports = {
  getStudentProgress,
  generateProgressInsights,
};