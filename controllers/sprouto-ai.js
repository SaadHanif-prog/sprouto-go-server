const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const cheerio = require("cheerio");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CHAT_MODEL = "gemini-2.5-flash";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min idle expiry
const MAX_HISTORY_TURNS = 20;           // Max user/model pairs retained

/**
 * In-memory session store.
 * Each entry: { chat, history, lastActive, site, siteContent }
 * Swap for Redis in production.
 */
const chatSessions = new Map();

// ─── Site Fetching ────────────────────────────────────────────────────────────

/**
 * Fetches real HTML from the URL and extracts SEO-relevant text.
 * Returns a grounded content string for the system prompt.
 */
async function fetchSiteContent(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SproutoGO-AIBot/1.0; +https://sproutogo.com)",
      },
    });

    const $ = cheerio.load(html);
    $("script, style, noscript, iframe, svg").remove();

    const title       = $("title").text().trim();
    const metaDesc    = $('meta[name="description"]').attr("content")?.trim() || "";
    const metaKw      = $('meta[name="keywords"]').attr("content")?.trim() || "";
    const canonical   = $('link[rel="canonical"]').attr("href")?.trim() || "";

    const h1s = [];
    $("h1").each((_, el) => h1s.push($(el).text().trim()));
    const h2s = [];
    $("h2").slice(0, 10).each((_, el) => h2s.push($(el).text().trim()));

    const internalLinks = new Set();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href?.startsWith("/") || href?.startsWith(url)) {
        internalLinks.add(href.startsWith("/") ? href : href.replace(url, ""));
      }
    });

    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

    return `
=== LIVE CONTENT FETCHED FROM: ${url} ===
Title: ${title}
Meta Description: ${metaDesc}
Meta Keywords: ${metaKw}
Canonical: ${canonical}
H1 Tags: ${h1s.join(" | ") || "None"}
H2 Tags: ${h2s.join(" | ") || "None"}
Internal Links: ${[...internalLinks].slice(0, 20).join(", ") || "None"}
Body Text Sample:
${bodyText}
=== END OF FETCHED CONTENT ===
    `.trim();
  } catch (err) {
    return `=== FETCH FAILED FOR: ${url} ===
Error: ${err.message}
Note: Site may be blocking bots or URL is invalid. Base responses on the site name and URL context only — do not invent specific data.
=== END ===`;
  }
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of chatSessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      chatSessions.delete(key);
    }
  }
}

function buildSystemInstruction(site, siteContent) {
  return `You are SproutoAI, an advanced, highly intelligent AI agent for the SproutoGO platform.

You are currently assisting the user with their site: ${site.name} (${site.url}).

Below is REAL, LIVE content fetched directly from their site. Use this as your primary knowledge source when answering questions about their site. Do NOT confuse this with SproutoGO's own platform or any other site.

${siteContent}

You can help the user with:
- Deep questions about their site's content, structure, and SEO
- Comparisons, predictions, and trend analysis based on the above content
- Generating reports, copy, or marketing material tailored to their niche
- Explaining audit results or keyword strategies

If the user asks you to create a document, report, or copy:
→ Format it beautifully in Markdown so they can export it.

Tone & Style:
- Professional, insightful, and highly capable
- Clear and structured with clean formatting (headings, bullets, spacing)
- Concise but valuable — avoid long dense paragraphs
- Always refer to the site by name: ${site.name}`;
}

/**
 * Creates a fresh Gemini chat session with the given history.
 */
function createGeminiChat(site, siteContent, history = []) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: buildSystemInstruction(site, siteContent),
  });
  return model.startChat({ history });
}

/**
 * Gets an existing session or creates a new one.
 * If the site URL changed (user switched sites), the session is rebuilt.
 * If history is too long, oldest turns are pruned and chat is rebuilt.
 */
async function getOrCreateSession(sessionKey, site, siteContent) {
  const existing = chatSessions.get(sessionKey);

  if (existing) {
    existing.lastActive = Date.now();

    // ── Site switched — rebuild session entirely with new site content ──
    if (existing.site.url !== site.url) {
      const freshContent = await fetchSiteContent(site.url);
      const newSession = {
        chat: createGeminiChat(site, freshContent),
        history: [],
        lastActive: Date.now(),
        site,
        siteContent: freshContent,
      };
      chatSessions.set(sessionKey, newSession);
      return newSession;
    }

    // ── History too long — trim and rebuild ──
    if (existing.history.length > MAX_HISTORY_TURNS * 2) {
      existing.history = existing.history.slice(-(MAX_HISTORY_TURNS * 2));
      existing.chat = createGeminiChat(
        existing.site,
        existing.siteContent,
        existing.history
      );
    }

    return existing;
  }

  // ── Brand-new session ──
  const session = {
    chat: createGeminiChat(site, siteContent),
    history: [],
    lastActive: Date.now(),
    site,
    siteContent,
  };

  chatSessions.set(sessionKey, session);
  return session;
}

// ─── Context Extraction ───────────────────────────────────────────────────────

/**
 * Parses the [Site: NAME | URL] tag injected by the frontend.
 */
function extractSiteContext(message = "") {
  const match = message.match(/\[Site:\s*(.*?)\s*\|\s*(.*?)\]/);
  if (!match) return { name: "Unknown Site", url: "" };
  return { name: match[1].trim(), url: match[2].trim() };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc    Send a message to SproutoAI assistant
 * @route   POST /api/ai/chat
 * @access  Private
 */
exports.sendChatMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;
  const sessionKey = req?.user?.userId || sessionId;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "message is required" });
  }

  if (!sessionKey) {
    return res.status(400).json({ success: false, message: "sessionId is required" });
  }

  pruneExpiredSessions();

  const site = extractSiteContext(message);

  // Fetch real site content if we have a URL and no cached session yet
  // (getOrCreateSession handles the cache-hit case)
  const existingSession = chatSessions.get(sessionKey);
  const needsFetch = !existingSession || existingSession.site.url !== site.url;
  const siteContent = needsFetch && site.url
    ? await fetchSiteContent(site.url)
    : existingSession?.siteContent || "No site content available.";

  const session = await getOrCreateSession(sessionKey, site, siteContent);

  // Strip the [Site:...] tag before sending to Gemini
  const cleanedMessage = message.replace(/\[Site:.*?\]\s*/g, "").trim();

  const result = await session.chat.sendMessage(cleanedMessage);
  const responseText = result.response.text();

  // Keep our own history in sync for trimming/rebuilding
  session.history.push(
    { role: "user",  parts: [{ text: cleanedMessage }] },
    { role: "model", parts: [{ text: responseText }] }
  );

  return res.status(200).json({
    success: true,
    data: { role: "model", content: responseText },
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