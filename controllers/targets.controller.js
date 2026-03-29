const asyncHandler = require("#utils/async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Target = require("#models/targets.model");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @desc    Get all targets for a site
 * @route   GET /api/targets/:siteId
 * @access  Private
 */
exports.getTargets = asyncHandler(async (req, res) => {
  const { siteId } = req.params;

  if (!siteId) {
    return res.status(400).json({ success: false, message: "siteId is required" });
  }

  const targets = await Target.find({ siteId }).sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: targets });
});

/**
 * @desc    Create a new target for a site
 * @route   POST /api/targets
 * @access  Private
 */
exports.createTarget = asyncHandler(async (req, res) => {
  const { siteId, metric, targetValue, unit, month, url } = req.body;

  if (!siteId || !metric || !targetValue || !unit || !month) {
    return res.status(400).json({
      success: false,
      message: "siteId, metric, targetValue, unit, and month are required",
    });
  }

  // Use Gemini to generate a realistic current value for the metric
  let currentValue = 0;

  if (url) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
You are an expert SEO and web analytics AI. Given the following website URL and a specific metric with its target value, estimate a realistic CURRENT value for that metric based on what you know about the site's niche and size.

URL: ${url}
Metric: ${metric}
Target Value: ${targetValue} ${unit}
Month: ${month}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
{
  "currentValue": <number>
}

Rules:
- The currentValue must be realistic for the site's niche and size.
- currentValue should be between 40% and 90% of the targetValue to show meaningful progress but room to grow.
- Return ONLY the JSON. No other text whatsoever.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const clean = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

      const parsed = JSON.parse(clean);
      currentValue = parsed.currentValue ?? 0;
    } catch {
      // Fallback: 60% of target
      currentValue = Math.round(targetValue * 0.6);
    }
  } else {
    currentValue = Math.round(targetValue * 0.6);
  }

  const target = await Target.create({
    siteId,
    metric,
    targetValue: Number(targetValue),
    currentValue: Number(currentValue),
    unit,
    month,
  });

  return res.status(201).json({ success: true, data: target });
});

/**
 * @desc    Update a target (e.g. refresh current value via Gemini)
 * @route   PUT /api/targets/:id
 * @access  Private
 */
exports.updateTarget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const target = await Target.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!target) {
    return res.status(404).json({ success: false, message: "Target not found" });
  }

  return res.status(200).json({ success: true, data: target });
});

/**
 * @desc    Delete a target
 * @route   DELETE /api/targets/:id
 * @access  Private
 */
exports.deleteTarget = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const target = await Target.findByIdAndDelete(id);

  if (!target) {
    return res.status(404).json({ success: false, message: "Target not found" });
  }

  return res.status(200).json({ success: true, message: "Target deleted successfully" });
});