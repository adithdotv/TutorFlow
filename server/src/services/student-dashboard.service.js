const pool = require("../config/db");

const getProfile = async (studentId) => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,

        sp.subject,
        sp.current_level,
        sp.learning_goals,
        sp.weak_areas

      FROM users u

      JOIN student_profiles sp
        ON sp.user_id = u.id

      WHERE u.id = $1
      AND u.role = 'student'
    `,
    [studentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Student profile not found");
  }

  return result.rows[0];
};

const getSessions = async (studentId) => {
  const result = await pool.query(
    `
      SELECT
        s.id,
        s.topic,
        s.scheduled_at,
        s.status,
        s.notes,
        s.ai_plan,
        s.ai_review,
        s.created_at,

        u.id AS tutor_id,
        u.name AS tutor_name,
        u.email AS tutor_email

      FROM sessions s

      JOIN users u
        ON u.id = s.tutor_id

      WHERE s.student_id = $1

      ORDER BY s.scheduled_at ASC
    `,
    [studentId]
  );

  return result.rows;
};

const getSessionById = async (
  sessionId,
  studentId
) => {
  const result = await pool.query(
    `
      SELECT
        s.id,
        s.topic,
        s.scheduled_at,
        s.status,
        s.notes,
        s.ai_plan,
        s.ai_review,
        s.created_at,

        u.id AS tutor_id,
        u.name AS tutor_name,
        u.email AS tutor_email

      FROM sessions s

      JOIN users u
        ON u.id = s.tutor_id

      WHERE s.id = $1
      AND s.student_id = $2
    `,
    [sessionId, studentId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "Session not found or does not belong to this student"
    );
  }

  return result.rows[0];
};

module.exports = {
  getProfile,
  getSessions,
  getSessionById,
};