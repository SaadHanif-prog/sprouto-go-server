const express = require("express");
const router = express.Router();

const { getAiStats } = require("#controllers/ai-stats.controller");

const authMiddleware = require("#middlewares/auth.middleware");

/**
 * @route POST /api/ai/stats
 * @desc Analyse a site URL with Gemini and return SEO/traffic stats
 */
router.post("/stats", authMiddleware, getAiStats);

module.exports = router;