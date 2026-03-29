const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @desc    Analyse a site URL with Gemini and return SEO/traffic stats
 * @route   POST /api/ai/stats
 * @access  Private
 */
exports.getAiStats = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "url is required",
    });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
You are an expert SEO and web analytics AI. Analyse the following website URL and return realistic, data-driven statistics for a client-facing dashboard.

URL: ${url}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. The shape must be exactly:

{
  "totalSearches": <number>,
  "totalClicks": <number>,
  "uniqueVisitors": <number>,
  "searchChange": "<string like +12.5%>",
  "clickChange": "<string like +8.2%>",
  "visitorChange": "<string like +14.1%>",
  "chartData": [
    { "name": "Jan", "searches": <number>, "clicks": <number> },
    { "name": "Feb", "searches": <number>, "clicks": <number> },
    { "name": "Mar", "searches": <number>, "clicks": <number> },
    { "name": "Apr", "searches": <number>, "clicks": <number> },
    { "name": "May", "searches": <number>, "clicks": <number> },
    { "name": "Jun", "searches": <number>, "clicks": <number> },
    { "name": "Jul", "searches": <number>, "clicks": <number> }
  ],
  "geoMarkers": [
    { "name": "<city>", "coordinates": [<lng>, <lat>], "clicks": <number>, "markerOffset": -15 },
    { "name": "<city>", "coordinates": [<lng>, <lat>], "clicks": <number>, "markerOffset": -15 },
    { "name": "<city>", "coordinates": [<lng>, <lat>], "clicks": <number>, "markerOffset": 25 },
    { "name": "<city>", "coordinates": [<lng>, <lat>], "clicks": <number>, "markerOffset": 25 },
    { "name": "<city>", "coordinates": [<lng>, <lat>], "clicks": <number>, "markerOffset": -15 }
  ],
  "recentActivities": [
    { "title": "<string>", "desc": "<string>", "time": "<string>", "type": "success" },
    { "title": "<string>", "desc": "<string>", "time": "<string>", "type": "info" },
    { "title": "<string>", "desc": "<string>", "time": "<string>", "type": "purple" },
    { "title": "<string>", "desc": "<string>", "time": "<string>", "type": "warning" }
  ]
}

Rules:
- Make all numbers realistic for the site's apparent niche and size.
- geoMarkers must be 5 cities most relevant to the site's likely audience.
- recentActivities must be specific and relevant to the site's niche (SEO tasks, content, backlinks, performance).
- type must be one of: success, info, purple, warning.
- Return ONLY the JSON. No other text whatsoever.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown fences if Gemini wraps them anyway
  const clean = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

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

  return res.status(200).json({
    success: true,
    data: parsed,
  });
});