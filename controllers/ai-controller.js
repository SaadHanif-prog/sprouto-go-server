const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// In-memory chat session store (keyed by userId or sessionId)
// For production, consider Redis or a DB-backed session store
const chatSessions = new Map();

/**
 * @desc    Send a message to Sprouto AI assistant and get a response
 * @route   POST /api/ai/chat
 * @access  Private
 */
exports.sendChatMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  // Use userId from auth middleware if available, else fall back to sessionId
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

  // Reuse existing chat session or create a new one
  if (!chatSessions.has(sessionKey)) {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are the AI support assistant for SproutoGO, powered by our innovative AI engine Go's and our bio-diverse system. You are Your Partners — built for microbusinesses to redefine their digital presence so they can focus on scaling.

You must ALWAYS use UK English spelling and grammar (e.g., "colour", "optimise", "programme", "£").
You must respond in a friendly, conversational, and highly human-like manner.
Always format your responses with clear, well-spaced paragraphs.
Use bullet points when listing items to make them easy to read.
Avoid dense walls of text.
Be concise but warm and helpful.`,
    });

    const chat = model.startChat({ history: [] });
    chatSessions.set(sessionKey, chat);
  }

  const chat = chatSessions.get(sessionKey);

  const result = await chat.sendMessage(message.trim());
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
 * @desc    Clear/reset a chat session
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