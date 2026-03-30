const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory session store (replace with Redis in production)
const chatSessions = new Map();

/**
 * Extract site context from message
 * Your frontend sends:
 * [Site: NAME | URL]
 */
const extractSiteContext = (message = "") => {
  const match = message.match(/\[Site:\s*(.*?)\s*\|\s*(.*?)\]/);

  if (!match) {
    return {
      name: "Unknown Site",
      url: "Unknown URL",
    };
  }

  return {
    name: match[1],
    url: match[2],
  };
};

/**
 * Build system instruction dynamically
 */
const buildSystemInstruction = (site) => `
You are SproutoAI, an advanced, slick, and highly intelligent AI agent for the SproutoGO platform.

You are currently assisting the user with their site: ${site.name} (${site.url}).

You can:
- Answer deep questions about their site
- Show comparisons
- Explain predictions
- Analyse uploaded documents or logos (based on text descriptions)
- Generate reports, documents, and copy

If the user asks you to create a document, report, or copy:
→ Format it beautifully in Markdown so they can export it.

Tone & Style:
- Be professional, insightful, and highly capable
- Be clear and structured
- Use clean formatting (headings, bullets, spacing)
- Avoid long dense paragraphs
- Be concise but valuable
`;

/**
 * @desc    Send a message to SproutoAI assistant
 * @route   POST /api/ai/chat
 * @access  Private
 */
exports.sendChatMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  const sessionKey = req?.user?.userId || sessionId;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "message is required",
    });
  }

  if (!sessionKey) {
    return res.status(400).json({
      success: false,
      message: "sessionId is required",
    });
  }

  // Extract site context from message
  const site = extractSiteContext(message);

  // Create session if not exists
  if (!chatSessions.has(sessionKey)) {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemInstruction(site),
    });

    const chat = model.startChat({
      history: [],
    });

    chatSessions.set(sessionKey, chat);
  }

  const chat = chatSessions.get(sessionKey);

  // Clean message (optional: remove site tag before sending to model)
  const cleanedMessage = message.replace(/\[Site:.*?\]\s*/g, "").trim();

  const result = await chat.sendMessage(cleanedMessage);
  const responseText = result.response.text();

  return res.status(200).json({
    success: true,
    data: {
      role: "model",
      content: responseText,
    },
  });
});

/**
 * @desc    Clear/reset chat session
 * @route   DELETE /api/ai/chat/:sessionId
 * @access  Private
 */
exports.clearChatSession = asyncHandler(async (req, res) => {
  const sessionKey = req?.user?.userId || req.params.sessionId;

  if (chatSessions.has(sessionKey)) {
    chatSessions.delete(sessionKey);
  }

  return res.status(200).json({
    success: true,
    message: "Chat session cleared",
  });
});