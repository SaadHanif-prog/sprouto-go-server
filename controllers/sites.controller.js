const Site = require("#models/site.model");
const User = require("#models/user.model");
const asyncHandler = require("#utils/async-handler");

/**
 * @desc Get all sites for logged-in user
 * @route GET /api/sites
 */
exports.getSites = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const sites = await Site.find({ userId }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: sites,
  });
});

/**
 * @desc Create a new site (with plan limit check)
 * @route POST /api/sites
 */
exports.createSite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      message: "URL is required",
    });
  }

  // 1️⃣ Get user
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // 2️⃣ Calculate allowed sites from activePlans
  const allowedSites = user.activePlans.reduce(
    (sum, plan) => sum + (plan.sitesLimit || 0),
    0
  );

  // 3️⃣ Count current sites
  const totalSites = await Site.countDocuments({ userId });

  // 4️⃣ Enforce limit
  if (totalSites >= allowedSites) {
    return res.status(403).json({
      message: "Site limit reached. Please upgrade your plan.",
    });
  }

  // 5️⃣ Create site
  const site = await Site.create({
    url,
    userId,
  });

  res.status(201).json({
    success: true,
    message: "Site created successfully",
    data: site,
  });
});