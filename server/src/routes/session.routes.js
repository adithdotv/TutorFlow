const express = require("express");
const sessionController = require("../controllers/session.controller");

const router = express.Router();

router.patch("/:id/status", sessionController.updateStatus);

module.exports = router;