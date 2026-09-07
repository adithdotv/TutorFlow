const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const TOKEN_EXPIRY = "1d";
const PASSWORD_SALT_ROUNDS = 10;

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY,
    }
  );
};

const login = async (email, password) => {
  const result = await pool.query(
    `
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];

  const passwordMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  return {
    token: createToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// Only tutors can self-register. Student accounts are always created by a
// tutor, so the role is never read from the request.
const registerTutor = async ({ name, email, password }) => {
  const existingUser = await pool.query(
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

  const passwordHash = await bcrypt.hash(
    password,
    PASSWORD_SALT_ROUNDS
  );

  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, 'tutor')
      RETURNING id, name, email, role
    `,
    [name, email, passwordHash]
  );

  const user = result.rows[0];

  return {
    token: createToken(user),
    user,
  };
};

module.exports = {
  login,
  registerTutor,
};
