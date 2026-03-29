const express = require("express");
const router = express.Router();

const { sendChatMessage, clearChatSession } = require("#controllers/ai-controller");

router.post("/chat", sendChatMessage);
router.delete("/chat/:sessionId", clearChatSession);

module.exports = router;