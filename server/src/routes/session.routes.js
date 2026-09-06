const express = require("express");

const sessionController = require("../controllers/session.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("tutor"),
  sessionController.createSession
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("tutor"),
  sessionController.updateStatus
);

module.exports = router;