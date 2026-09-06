const pool = require("../config/db");

const transitions = {
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "AI_REVIEWED",
};

const updateSessionStatus = async (sessionId, newStatus) => {
  const result = await pool.query(
    "SELECT id, status FROM sessions WHERE id = $1",
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

module.exports = {
  updateSessionStatus,
};