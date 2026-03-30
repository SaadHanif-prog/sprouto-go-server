const express = require("express");
const router = express.Router();

const {
  sendChatMessage,
  clearChatSession,
} = require("#controllers/sprouto-ai");

// ================= ROUTES =================

// Send message to SproutoAI
// POST /api/ai/chat
router.post("/chat", sendChatMessage);

// Clear/reset session
// DELETE /api/ai/chat/:sessionId
router.delete("/chat/:sessionId", clearChatSession);

module.exports = router;