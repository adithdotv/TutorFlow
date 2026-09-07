const express = require("express");

const studentDashboardController = require(
  "../controllers/student-dashboard.controller"
);

const {
  authenticate,
} = require("../middleware/auth.middleware");

const {
  authorize,
} = require("../middleware/role.middleware");

const router = express.Router();

router.get(
  "/me",
  authenticate,
  authorize("student"),
  studentDashboardController.getProfile
);

router.get(
  "/sessions",
  authenticate,
  authorize("student"),
  studentDashboardController.getSessions
);

router.get(
  "/sessions/:id",
  authenticate,
  authorize("student"),
  studentDashboardController.getSessionById
);

module.exports = router;