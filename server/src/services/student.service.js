const pool = require("../config/db");
const bcrypt = require("bcrypt");

const createStudent = async ({
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
    // Start transaction
    await client.query("BEGIN");

    // 1. Check if email already exists
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

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create student user
    const userResult = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, 'student')
        RETURNING id, name, email, role
      `,
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    // 4. Create student profile
    const profileResult = await client.query(
      `
        INSERT INTO student_profiles (
          user_id,
          subject,
          current_level,
          learning_goals,
          weak_areas
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        user.id,
        subject,
        currentLevel,
        learningGoals,
        weakAreas,
      ]
    );

    const profile = profileResult.rows[0];

    // 5. Everything succeeded
    await client.query("COMMIT");

    return {
      user,
      profile,
    };
  } catch (error) {
    // Something failed → undo everything
    await client.query("ROLLBACK");

    throw error;
  } finally {
    // Always return client to pool
    client.release();
  }
};

module.exports = {
  createStudent,
};