const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanJson = (text) =>
  text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

/**
 * @desc    Fetch a live SEO audit from Gemini for a given URL
 * @route   POST /api/auditor/audit
 * @access  Private
 */
exports.getAudit = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: "url is required" });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

  const prompt = `
You are an expert SEO and GEO consultant. Analyse the following website URL and return a realistic, data-driven SEO audit for a client-facing dashboard. You need to view the site in its entirety, including all major pages, to generate accurate insights. Use your knowledge of SEO and GEO best practices, common issues, and industry benchmarks to create a comprehensive report.

URL: ${url}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. The shape must be exactly:

{
  "healthScore": <number 0-100>,
  "organicTraffic": <number in thousands e.g. 12.4>,
  "criticalIssues": <number>,
  "trendingKeywords": ["<keyword>", "<keyword>", "<keyword>", "<keyword>", "<keyword>", "<keyword>"],
  "pageBreakdown": [
    { "url": "<path>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<path>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<path>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<path>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" }
  ]
}

Rules:
All numbers must be realistic for the site's niche and size.
trendingKeywords must be 6 keywords relevant to the site's actual content. 
trendingKeywords you need to find for the site's niche and should be current trends. 
The "url": "<path>" must be an actual url from the site, not random paths and placeholders. 
pageBreakdown must include at least one of each status: Good, Needs Work, Critical.
organicTraffic is a decimal representing thousands (12.4 = 12,400 visitors).
Return ONLY the JSON. No other text whatsoever.
`;

  const result = await model.generateContent(prompt);
  const clean = cleanJson(result.response.text());

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return res
      .status(502)
      .json({
        success: false,
        message: "AI returned malformed JSON",
        raw: clean,
      });
  }

  return res.status(200).json({ success: true, data: parsed });
});

/**
 * @desc    Chat with the SEO assistant — client sends full message history + current audit data
 * @route   POST /api/auditor/chat
 * @access  Private
 *
 * FIX: Gemini requires the first history entry to have role "user".
 *      The frontend seeds the conversation with an initial model greeting — we strip
 *      all leading model messages before building the history array, and also strip
 *      the synthetic greeting so it never reaches Gemini.
 */
exports.chat = asyncHandler(async (req, res) => {
  const { url, siteName, messages, auditContext } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "messages array is required" });
  }

  const contextBlock = auditContext
    ? `
Current SEO Audit Data for ${siteName || url}:
Health Score: ${auditContext.healthScore}/100
Organic Traffic: ${auditContext.organicTraffic}k visitors/month
Critical Issues: ${auditContext.criticalIssues}
Trending Keywords: ${auditContext.trendingKeywords?.join(", ")}
Page Breakdown: ${auditContext.pageBreakdown
        ?.map(
          (p) =>
            `${p.url} (Health: ${p.health}, Status: ${p.status}, Top Keyword: ${p.keyword})`,
        )
        .join("; ")}
`
    : `Site URL: ${url || siteName}. No audit data available yet.`;

  const systemInstruction = `You are an expert SEO and GEO consultant for SproutoGO, a professional SEO platform.
The user is asking about their site's SEO health, trending keywords, and performance improvements.

${contextBlock}

Respond in a friendly, conversational, human-like manner. Use clear paragraphs and bullet points when listing items. Be concise, warm, and helpful.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  // ── Drop the last message (that's the one we'll send via sendMessage) ──
  const allButLast = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

  // ── Strip any leading model messages so history always starts with "user" ──
  const firstUserIndex = allButLast.findIndex((m) => m.role === "user");
  const safeHistory =
    firstUserIndex === -1
      ? []
      : allButLast.slice(firstUserIndex).map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

  const chat = model.startChat({ history: safeHistory });
  const result = await chat.sendMessage(lastMessage.content);

  return res.status(200).json({
    success: true,
    data: { reply: result.response.text() },
  });
});

/**
 * @desc    Generate next-month keyword targets CSV from Gemini using the URL
 * @route   POST /api/auditor/targets-csv
 * @access  Private
 */

exports.getTargetsCsv = asyncHandler(async (req, res) => {
  const { url, auditContext } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: "url is required" });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

  const contextLines = auditContext
    ? `- Health Score: ${auditContext.healthScore}/100
Organic Traffic: ${auditContext.organicTraffic}k
Critical Issues: ${auditContext.criticalIssues}
Trending Keywords: ${auditContext.trendingKeywords?.join(", ")}`
    : `- URL: ${url}`;

  const prompt = `
You are an expert SEO consultant. Generate realistic next-month keyword targets as a CSV for this site.

Site URL: ${url}
${contextLines}

Return ONLY a CSV string with this exact header and 4 data rows — no markdown, no explanation:
Target Keyword,Search Volume,Difficulty,Current Rank,Target Rank

Rules:
Use keywords relevant to the site's actual niche.
Difficulty must be one of: High, Medium, Low.
All numbers must be realistic.
Return ONLY the raw CSV text.
`;

  const result = await model.generateContent(prompt);
  const csv = result.response.text().trim();

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="next_month_targets.csv"',
  );
  return res.status(200).send(csv);
});
