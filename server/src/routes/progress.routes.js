const express = require("express");

const progressController = require(
  "../controllers/progress.controller"
);

const {
  authenticate,
} = require("../middleware/auth.middleware");

const {
  authorize,
} = require("../middleware/role.middleware");

const router = express.Router();


router.get(
  "/students/:studentId",
  authenticate,
  authorize("tutor"),
  progressController.getProgress
);


router.post(
  "/students/:studentId/ai-insights",
  authenticate,
  authorize("tutor"),
  progressController.generateInsights
);


module.exports = router;