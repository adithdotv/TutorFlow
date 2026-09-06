const express = require("express");

const studentController = require("../controllers/student.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("tutor"),
  studentController.createStudent
);

router.get(
  "/",
  authenticate,
  authorize("tutor"),
  studentController.getStudents
);

module.exports = router;