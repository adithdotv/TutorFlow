const pool = require("../config/db");
const aiService = require("./ai.service");

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
        SELECT
          u.id,
          u.name,
          u.email
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
      const conflictError = new Error(
        "You already has a session at this time"
      );
      conflictError.statusCode = 409;
      throw conflictError;
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

    if (
      error.code === "23505" &&
      error.constraint ===
        "sessions_tutor_scheduled_at_unique"
    ) {
      const conflictError = new Error(
        "Tutor already has a session at this time"
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
};

const updateSessionStatus = async (
  sessionId,
  newStatus,
  tutorId
) => {
  const result = await pool.query(
    `
      SELECT id, status
      FROM sessions
      WHERE id = $1
        AND tutor_id = $2
    `,
    [sessionId, tutorId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "Session not found or does not belong to this tutor"
    );
  }

  const session = result.rows[0];

  const expectedNextStatus =
    transitions[session.status];

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
        AND tutor_id = $3
      RETURNING *
    `,
    [
      newStatus,
      sessionId,
      tutorId,
    ]
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


const getSessionWithStudentContext = async (sessionId, tutorId) => {
  const sessionResult = await pool.query(
    `
      SELECT
        s.id,
        s.topic,
        s.scheduled_at,
        s.status,
        s.ai_plan,

        u.id AS student_id,
        u.name AS student_name,

        sp.subject,
        sp.current_level,
        sp.learning_goals,
        sp.weak_areas

      FROM sessions s

      JOIN users u
        ON u.id = s.student_id

      JOIN student_profiles sp
        ON sp.user_id = s.student_id

      WHERE s.id = $1
      AND s.tutor_id = $2
    `,
    [sessionId, tutorId]
  );

  if (sessionResult.rows.length === 0) {
    throw new Error("Session not found");
  }

  const session = sessionResult.rows[0];

  const pastSessionsResult = await pool.query(
    `
      SELECT
        topic,
        status,
        ai_review,
        scheduled_at
      FROM sessions
      WHERE student_id = $1
      AND scheduled_at < $2
      ORDER BY scheduled_at DESC
    `,
    [session.student_id, session.scheduled_at]
  );

  return {
    session,
    pastSessions: pastSessionsResult.rows,
  };
};

const getSessionById = async (sessionId, tutorId) => {
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
        s.tutor_id,
        s.student_id,
        u.name AS student_name,
        u.email AS student_email
      FROM sessions s
      JOIN users u ON u.id = s.student_id
      WHERE s.id = $1
        AND s.tutor_id = $2
    `,
    [sessionId, tutorId]
  );

  if (result.rows.length === 0) {
    throw new Error("Session not found");
  }

  return result.rows[0];
};


const generatePlan = async (sessionId, tutorId) => {
  const { session, pastSessions } =
    await getSessionWithStudentContext(
      sessionId,
      tutorId
    );

  if (session.status !== "SCHEDULED") {
    throw new Error(
      "AI session plan can only be generated for scheduled sessions"
    );
  }

  const student = {
    name: session.student_name,
    subject: session.subject,
    current_level: session.current_level,
    learning_goals: session.learning_goals,
    weak_areas: session.weak_areas,
  };

  const plan = await aiService.generateSessionPlan({
    student,
    session,
    pastSessions,
  });

  const result = await pool.query(
    `
      UPDATE sessions
      SET ai_plan = $1
      WHERE id = $2
      AND tutor_id = $3
      RETURNING *
    `,
    [
      JSON.stringify(plan),
      sessionId,
      tutorId,
    ]
  );

  return result.rows[0];
};


const updateSessionNotes = async (
  sessionId,
  tutorId,
  notes
) => {
  const result = await pool.query(
    `
      SELECT id, status
      FROM sessions
      WHERE id = $1
      AND tutor_id = $2
    `,
    [sessionId, tutorId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "Session not found or does not belong to this tutor"
    );
  }

  const session = result.rows[0];

  if (session.status !== "IN_PROGRESS") {
    throw new Error(
      "Notes can only be edited while the session is in progress"
    );
  }

  const updatedSession = await pool.query(
    `
      UPDATE sessions
      SET notes = $1
      WHERE id = $2
      AND tutor_id = $3
      RETURNING id, notes, status
    `,
    [notes, sessionId, tutorId]
  );

  return updatedSession.rows[0];
};


const generateReview = async (
  sessionId,
  tutorId
) => {
  const result = await pool.query(
    `
      SELECT
        s.id,
        s.topic,
        s.status,
        s.notes,

        u.id AS student_id,
        u.name AS student_name,

        sp.subject,
        sp.current_level,
        sp.learning_goals,
        sp.weak_areas

      FROM sessions s

      JOIN users u
        ON u.id = s.student_id

      JOIN student_profiles sp
        ON sp.user_id = s.student_id

      WHERE s.id = $1
      AND s.tutor_id = $2
    `,
    [sessionId, tutorId]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "Session not found or does not belong to this tutor"
    );
  }

  const session = result.rows[0];

  if (session.status !== "COMPLETED") {
    throw new Error(
      "AI review can only be generated for completed sessions"
    );
  }

  const student = {
    name: session.student_name,
    subject: session.subject,
    current_level: session.current_level,
    learning_goals: session.learning_goals,
    weak_areas: session.weak_areas,
  };

  const review =
    await aiService.generateSessionReview({
      student,
      session,
    });

  const updatedSession = await pool.query(
    `
      UPDATE sessions
      SET
        ai_review = $1,
        status = 'AI_REVIEWED'
      WHERE id = $2
      AND tutor_id = $3
      AND status = 'COMPLETED'
      RETURNING *
    `,
    [
      JSON.stringify(review),
      sessionId,
      tutorId,
    ]
  );

  if (updatedSession.rows.length === 0) {
    throw new Error(
      "Session could not be reviewed"
    );
  }

  return updatedSession.rows[0];
};

module.exports = {
  createSession,
  updateSessionStatus,
  getSessionsByTutor,
  getSessionById,
  getSessionWithStudentContext,
  generatePlan,
  updateSessionNotes,
  generateReview,
};