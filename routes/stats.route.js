const express = require("express");
const router = express.Router();

const { getAiStats } = require("#controllers/stats.controller");


/**
 * @route POST /api/ai/stats
 * @desc Analyse a site URL with Gemini and return SEO/traffic stats
 */
router.post("/", getAiStats);

module.exports = router;