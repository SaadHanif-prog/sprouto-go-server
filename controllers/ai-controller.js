const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const cheerio = require("cheerio");
const Site = require("#models/site.model");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CHAT_MODEL = "gemini-2.5-flash";
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_HISTORY_TURNS = 20;

const chatSessions = new Map();

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

    const title    = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";
    const metaKw   = $('meta[name="keywords"]').attr("content")?.trim() || "";
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";

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
Note: Site may be blocking bots or URL is invalid.
=== END ===`;
  }
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of chatSessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) chatSessions.delete(key);
  }
}

function buildSystemInstruction(site, siteContent) {
  return `You are SproutoAI, an AI support assistant built exclusively for the SproutoGO platform.

You are scoped ONLY to the following site:
  Name: ${site.name}
  URL:  ${site.url}

Below is live content fetched directly from that site. Use it as your primary knowledge source.

${siteContent}

━━━ STRICT SCOPE RULE ━━━
You ONLY answer questions directly relevant to:
- ${site.name}'s content, SEO, GEO, performance, copy, strategy, or marketing
- Data, metrics, or audit results for this specific site
- Generating reports, copy, or materials tailored to this site's niche

If the user asks about anything outside this scope — general knowledge, other websites, coding help, personal questions, world events, or anything unrelated to ${site.name} — respond ONLY with:
"I'm SproutoAI, purpose-built for **${site.name}**. I'm not designed for general conversations — but I'd love to help you with anything related to your site! What would you like to know?"

Do NOT attempt to answer off-topic questions even partially. Politely redirect every time.
━━━━━━━━━━━━━━━━━━━━━━━━━

Tone & Style:
- Use UK English spelling and grammar (e.g. "colour", "optimise", "programme", "£")
- Friendly, conversational, and highly human-like
- Clean Markdown formatting (headings, bullets, spacing)
- Always refer to the site by name: ${site.name}`;
}

function createChat(site, siteContent, history = []) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: buildSystemInstruction(site, siteContent),
  });
  return model.startChat({ history });
}

async function getOrCreateSession(sessionKey, site, siteContent) {
  const existing = chatSessions.get(sessionKey);

  if (existing) {
    existing.lastActive = Date.now();

    if (existing.site._id?.toString() !== site._id?.toString()) {
      const freshContent = await fetchSiteContent(site.url);
      const newSession = {
        chat: createChat(site, freshContent),
        history: [],
        lastActive: Date.now(),
        site,
        siteContent: freshContent,
      };
      chatSessions.set(sessionKey, newSession);
      return newSession;
    }

    if (existing.history.length > MAX_HISTORY_TURNS * 2) {
      existing.history = existing.history.slice(-(MAX_HISTORY_TURNS * 2));
      existing.chat = createChat(existing.site, existing.siteContent, existing.history);
    }

    return existing;
  }

  const session = {
    chat: createChat(site, siteContent),
    history: [],
    lastActive: Date.now(),
    site,
    siteContent,
  };
  chatSessions.set(sessionKey, session);
  return session;
}

exports.sendChatMessage = asyncHandler(async (req, res) => {
  const { message, sessionId, siteId } = req.body;
  const sessionKey = req?.user?.userId || sessionId;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: "message is required" });
  }
  if (!siteId) {
    return res.status(400).json({ success: false, message: "siteId is required" });
  }
  if (!sessionKey) {
    return res.status(400).json({ success: false, message: "sessionId is required" });
  }

  pruneExpiredSessions();

  const site = await Site.findById(siteId).lean();
  if (!site) {
    return res.status(404).json({ success: false, message: "Site not found" });
  }

  const existingSession = chatSessions.get(sessionKey);
  const needsFetch =
    !existingSession || existingSession.site._id?.toString() !== site._id?.toString();

  const siteContent =
    needsFetch && site.url
      ? await fetchSiteContent(site.url)
      : existingSession?.siteContent || "No site content available.";

  const session = await getOrCreateSession(sessionKey, site, siteContent);

  const result = await session.chat.sendMessage(message.trim());
  const responseText = result.response.text();

  session.history.push(
    { role: "user",  parts: [{ text: message.trim() }] },
    { role: "model", parts: [{ text: responseText }] }
  );

  return res.status(200).json({
    success: true,
    data: { role: "model", content: responseText },
  });
});

exports.clearChatSession = asyncHandler(async (req, res) => {
  const sessionKey = req?.user?.userId || req.params.sessionId;
  if (chatSessions.has(sessionKey)) chatSessions.delete(sessionKey);
  return res.status(200).json({ success: true, message: "Chat session cleared" });
});