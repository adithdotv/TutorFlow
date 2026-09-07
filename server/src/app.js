const sessionRoutes = require("./routes/session.routes");
const authRoutes = require("./routes/auth.routes");
const studentRoutes = require("./routes/student.routes");
const studentDashboardRoutes = require(
  "./routes/student-dashboard.routes"
);
const progressRoutes = require("./routes/progress.routes");

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/db");

const app = express();

const corsOrigin = process.env.CLIENT_URL || "*";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/api/sessions", sessionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/student", studentDashboardRoutes);
app.use("/api/progress", progressRoutes);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "TutorFlow API is running",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});