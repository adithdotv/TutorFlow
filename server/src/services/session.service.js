const pool = require("../config/db");

const transitions = {
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "AI_REVIEWED",
};

const createSession = async ({
  tutorId,
  studentId,
  topic,
  scheduledAt,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify student exists and has STUDENT role
    const studentResult = await client.query(
      `
        SELECT id, name, email
        FROM users
        WHERE id = $1
        AND role = 'student'
      `,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error("Student not found");
    }

    // 2. Check tutor's schedule for clashes
    const existingSession = await client.query(
      `
        SELECT id
        FROM sessions
        WHERE tutor_id = $1
        AND scheduled_at = $2
      `,
      [tutorId, scheduledAt]
    );

    if (existingSession.rows.length > 0) {
      throw new Error(
        "Tutor already has a session at this time"
      );
    }

    // 3. Create session
    const sessionResult = await client.query(
      `
        INSERT INTO sessions (
          tutor_id,
          student_id,
          topic,
          scheduled_at
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        tutorId,
        studentId,
        topic,
        scheduledAt,
      ]
    );

    await client.query("COMMIT");

    return sessionResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateSessionStatus = async (sessionId, newStatus) => {
  const result = await pool.query(
    `
      SELECT id, status
      FROM sessions
      WHERE id = $1
    `,
    [sessionId]
  );

  if (result.rows.length === 0) {
    throw new Error("Session not found");
  }

  const session = result.rows[0];

  const expectedNextStatus = transitions[session.status];

  if (expectedNextStatus !== newStatus) {
    throw new Error(
      `Invalid transition: ${session.status} → ${newStatus}`
    );
  }

  const updatedSession = await pool.query(
    `
      UPDATE sessions
      SET status = $1
      WHERE id = $2
      RETURNING *
    `,
    [newStatus, sessionId]
  );

  return updatedSession.rows[0];
};


const getSessionsByTutor = async (tutorId) => {
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

        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email

      FROM sessions s

      JOIN users u
        ON u.id = s.student_id

      WHERE s.tutor_id = $1

      ORDER BY s.scheduled_at ASC
    `,
    [tutorId]
  );

  return result.rows;
};

module.exports = {
  createSession,
  updateSessionStatus,
  getSessionsByTutor,
};