require("dotenv").config();

const { Pool } = require("pg");

console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;