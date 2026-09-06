const pool = require("../config/db");
const bcrypt = require("bcrypt");

const createStudent = async ({
  tutorId,
  name,
  email,
  password,
  subject,
  currentLevel,
  learningGoals,
  weakAreas,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, 'STUDENT')
        RETURNING id, name, email, role
      `,
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    const profileResult = await client.query(
      `
        INSERT INTO student_profiles (
          user_id,
          tutor_id,
          subject,
          current_level,
          learning_goals,
          weak_areas
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        user.id,
        tutorId,
        subject,
        currentLevel,
        learningGoals,
        weakAreas,
      ]
    );

    const profile = profileResult.rows[0];

    await client.query("COMMIT");

    return {
      user,
      profile,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};


const getStudentsByTutor = async (tutorId) => {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        sp.subject,
        sp.current_level,
        sp.learning_goals,
        sp.weak_areas,
        sp.created_at
      FROM users u
      JOIN student_profiles sp
        ON sp.user_id = u.id
      WHERE sp.tutor_id = $1
      ORDER BY u.name ASC
    `,
    [tutorId]
  );

  return result.rows;
};

module.exports = {
  createStudent,
  getStudentsByTutor,
};