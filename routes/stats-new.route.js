const express = require("express");
const router = express.Router();

const {
  connectGoogle,
  googleCallback,
  getAiStats,
} = require("#controllers/stats-new.controller");

const authMiddleware = require("#middlewares/auth.middleware");

// =========================
// GOOGLE OAUTH
// =========================

router.get("/connect-google", authMiddleware, connectGoogle);

router.get("/callback", googleCallback);

// =========================
// ANALYTICS DATA
// =========================

router.post("/stats", authMiddleware, getAiStats);

module.exports = router;