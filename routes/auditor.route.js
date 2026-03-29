const express = require("express");
const router = express.Router();

const { getAudit, chat, getTargetsCsv } = require("#controllers/auditor.controller");

router.post("/audit", getAudit);
router.post("/chat", chat);
router.post("/targets-csv", getTargetsCsv);

module.exports = router;