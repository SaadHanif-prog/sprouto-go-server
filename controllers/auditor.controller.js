const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const cheerio = require("cheerio");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanJson = (text) =>
  text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

/**
 * Fetches real HTML from the given URL and extracts SEO-relevant text content.
 * Returns a structured string Gemini can reason over — NOT just the URL.
 */
async function fetchSiteContent(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SproutoGO-SEOBot/1.0; +https://sproutogo.com)",
      },
    });

    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, noscript, iframe, svg").remove();

    const title = $("title").text().trim();
    const metaDesc =
      $('meta[name="description"]').attr("content")?.trim() || "";
    const metaKeywords =
      $('meta[name="keywords"]').attr("content")?.trim() || "";
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
    const ogDesc =
      $('meta[property="og:description"]').attr("content")?.trim() || "";
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";

    const h1s = [];
    $("h1").each((_, el) => h1s.push($(el).text().trim()));

    const h2s = [];
    $("h2").each((_, el) => h2s.push($(el).text().trim()));

    const h3s = [];
    $("h3")
      .slice(0, 10)
      .each((_, el) => h3s.push($(el).text().trim()));

    // Collect internal links (paths only)
    const internalLinks = new Set();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && (href.startsWith("/") || href.startsWith(url))) {
        internalLinks.add(href.startsWith("/") ? href : href.replace(url, ""));
      }
    });

    // Body text (trimmed to ~3000 chars to stay within token budget)
    const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

    return `
=== REAL PAGE CONTENT FETCHED FROM: ${url} ===
Title: ${title}
Meta Description: ${metaDesc}
Meta Keywords: ${metaKeywords}
OG Title: ${ogTitle}
OG Description: ${ogDesc}
Canonical URL: ${canonical}

H1 Tags: ${h1s.join(" | ") || "None found"}
H2 Tags: ${h2s.slice(0, 10).join(" | ") || "None found"}
H3 Tags: ${h3s.join(" | ") || "None found"}

Internal Links Found: ${[...internalLinks].slice(0, 20).join(", ") || "None found"}

Body Text Sample:
${bodyText}
=== END OF FETCHED CONTENT ===
    `.trim();
  } catch (err) {
    // If fetch fails, tell Gemini explicitly — don't let it hallucinate
    return `=== FETCH FAILED FOR: ${url} ===
Error: ${err.message}
Reason: The site may be blocking bots, offline, or the URL is invalid.
IMPORTANT: Do NOT invent or hallucinate data. Return realistic estimates clearly labelled as estimates since live data was unavailable.
=== END ===`;
  }
}

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

  // ── Step 1: Actually fetch the site ──
  const siteContent = await fetchSiteContent(url);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });

  const prompt = `
You are an expert SEO and GEO consultant. Below is the REAL, LIVE content fetched directly from the website. 
Base your entire audit on THIS content only. Do NOT make up data unrelated to what is shown below.
Do NOT confuse this site with any other site, platform, or dashboard (including SproutoGO itself).

${siteContent}

Analyse the above content and return a realistic, data-driven SEO audit. Use SEO best practices and industry benchmarks where needed to fill gaps, but stay true to what the content shows.

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. The shape must be exactly:

{
  "healthScore": <number 0-100>,
  "organicTraffic": <number in thousands e.g. 12.4>,
  "criticalIssues": <number>,
  "trendingKeywords": ["<keyword>", "<keyword>", "<keyword>", "<keyword>", "<keyword>", "<keyword>"],
  "pageBreakdown": [
    { "url": "<actual path from the internal links above>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<actual path from the internal links above>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<actual path from the internal links above>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" },
    { "url": "<actual path from the internal links above>", "health": <number 0-100>, "keyword": "<top keyword>", "status": "<Good|Needs Work|Critical>" }
  ]
}

Rules:
- healthScore must reflect the real on-page SEO quality visible in the fetched content (missing meta tags, thin H1s, etc.).
- trendingKeywords must come from the actual content/niche of this site — do NOT use generic SEO terms.
- pageBreakdown "url" values must be real paths taken from the Internal Links Found section above. If fewer than 4 exist, use "/" as a fallback with a note in keyword.
- pageBreakdown must include at least one of each status: Good, Needs Work, Critical.
- organicTraffic is a decimal representing thousands (12.4 = 12,400 visitors/month).
- Return ONLY the JSON. No other text whatsoever.
`;

  const result = await model.generateContent(prompt);
  const clean = cleanJson(result.response.text());

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return res.status(502).json({
      success: false,
      message: "AI returned malformed JSON",
      raw: clean,
    });
  }

  return res.status(200).json({ success: true, data: parsed });
});

/**
 * @desc    Chat with the SEO assistant
 * @route   POST /api/auditor/chat
 * @access  Private
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
            `${p.url} (Health: ${p.health}, Status: ${p.status}, Top Keyword: ${p.keyword})`
        )
        .join("; ")}
`
    : `Site URL: ${url || siteName}. No audit data available yet.`;

  const systemInstruction = `You are an expert SEO and GEO consultant for SproutoGO, a professional SEO platform.
The user is asking about their site's SEO health, trending keywords, and performance improvements.
You are analysing the CLIENT'S site — NOT SproutoGO's own site. Keep all insights focused on the URL provided.

${contextBlock}

Respond in a friendly, conversational, human-like manner. Use clear paragraphs and bullet points when listing items. Be concise, warm, and helpful.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const allButLast = messages.slice(0, -1);
  const lastMessage = messages[messages.length - 1];

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
 * @desc    Generate next-month keyword targets CSV
 * @route   POST /api/auditor/targets-csv
 * @access  Private
 */
exports.getTargetsCsv = asyncHandler(async (req, res) => {
  const { url, auditContext } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: "url is required" });
  }

  // ── Fetch real content so keywords are grounded ──
  const siteContent = await fetchSiteContent(url);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });

  const contextLines = auditContext
    ? `Current Audit Context:
- Health Score: ${auditContext.healthScore}/100
- Organic Traffic: ${auditContext.organicTraffic}k
- Critical Issues: ${auditContext.criticalIssues}
- Trending Keywords: ${auditContext.trendingKeywords?.join(", ")}`
    : "";

  const prompt = `
You are an expert SEO consultant. Below is REAL content fetched from the site. 
Use this to generate accurate, niche-relevant keyword targets — not generic SEO terms.

${siteContent}

${contextLines}

Generate realistic next-month keyword targets as a CSV. 
Return ONLY a CSV string with this exact header and 4 data rows — no markdown, no explanation:
Target Keyword,Search Volume,Difficulty,Current Rank,Target Rank

Rules:
- Keywords must come from the actual niche/content visible above.
- Difficulty must be one of: High, Medium, Low.
- All numbers must be realistic for this site's size and niche.
- Return ONLY the raw CSV text.
`;

  const result = await model.generateContent(prompt);
  const csv = result.response.text().trim();

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="next_month_targets.csv"'
  );
  return res.status(200).send(csv);
});