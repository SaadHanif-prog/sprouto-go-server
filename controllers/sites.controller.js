const Site = require("#models/site.model");
const User = require("#models/user.model");
const asyncHandler = require("#utils/async-handler");
const {newSiteCreatedEmail} = require("#utils/email templates/new-site")
const {getResend} = require("#utils/resend")

/**
 * @desc Get all sites for logged-in user
 * @route GET /api/sites
 */
exports.getSites = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const sites = await Site.find({ userId })
    .select("name url plan entitlementId createdAt") 
    .sort({ createdAt: -1 });

  const formatted = sites.map((site) => ({
    id: site._id,
    name: site.name,
    url: site.url,
    plan: site.plan,
  }));

  res.json({
    success: true,
    data: formatted,
  });
});

/**
 * @desc Create a new site (with plan limit check)
 * @route POST /api/sites
 */

// exports.createSite = asyncHandler(async (req, res) => {
//   const userId = req.user.id;
//   const { name, url } = req.body;

//   if (!url || !name) {
//     return res.status(400).json({ message: "Name and URL are required" });
//   }

//   const user = await User.findById(userId);

//   if (!user) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   const now = new Date();

//   // 1. Active entitlements
//   const activeEntitlements = user.entitlements.filter(
//     (e) => new Date(e.expiresAt) > now
//   );

//   if (!activeEntitlements.length) {
//     return res.status(403).json({
//       message: "No active subscription found",
//     });
//   }

//   // 2. Plan limits (hardcoded)
//   const PLAN_LIMITS = {
//     starter: 1,
//     pro: 3,
//   };

//   // 3. Calculate total allowed sites
//   const allowedSites = activeEntitlements.reduce((sum, e) => {
//     return sum + (PLAN_LIMITS[e.plan] || 0);
//   }, 0);

//   // 4. Count current sites
//   const totalSites = await Site.countDocuments({ userId });

//   if (totalSites >= allowedSites) {
//     return res.status(403).json({
//       message: "Site limit reached. Please upgrade your plan.",
//     });
//   }

//   //  5. Select entitlement with available space
//   let selectedEntitlement = null;

//   for (const entitlement of activeEntitlements) {
//     const count = await Site.countDocuments({
//       entitlementId: entitlement._id,
//     });

//     const limit = PLAN_LIMITS[entitlement.plan] || 0;

//     if (count < limit) {
//       selectedEntitlement = entitlement;
//       break;
//     }
//   }

//   if (!selectedEntitlement) {
//     return res.status(403).json({
//       message: "All plans are fully utilized",
//     });
//   }

//   //  6. Create site
//   const site = await Site.create({
//   name,
//   url,
//   userId,
//   entitlementId: selectedEntitlement._id,
//   plan: selectedEntitlement.plan, // FIX
// });

//   res.status(201).json({
//     success: true,
//     message: "Site created successfully",
//     data: site,
//   });
// });



exports.createSite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, url } = req.body;

  if (!url || !name) {
    return res.status(400).json({ message: "Name and URL are required" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const now = new Date();

  const activeEntitlements = user.entitlements.filter(
    (e) => new Date(e.expiresAt) > now
  );

  if (!activeEntitlements.length) {
    return res.status(403).json({
      message: "No active subscription found",
    });
  }

  const PLAN_LIMITS = {
    starter: 1,
    pro: 3,
  };

  const allowedSites = activeEntitlements.reduce((sum, e) => {
    return sum + (PLAN_LIMITS[e.plan] || 0);
  }, 0);

  const totalSites = await Site.countDocuments({ userId });

  if (totalSites >= allowedSites) {
    return res.status(403).json({
      message: "Site limit reached. Please upgrade your plan.",
    });
  }

  let selectedEntitlement = null;

  for (const entitlement of activeEntitlements) {
    const count = await Site.countDocuments({
      entitlementId: entitlement._id,
    });

    const limit = PLAN_LIMITS[entitlement.plan] || 0;

    if (count < limit) {
      selectedEntitlement = entitlement;
      break;
    }
  }

  if (!selectedEntitlement) {
    return res.status(403).json({
      message: "All plans are fully utilized",
    });
  }

  const site = await Site.create({
    name,
    url,
    userId,
    entitlementId: selectedEntitlement._id,
    plan: selectedEntitlement.plan,
  });

  // ✅ Send email to ADMIN
  const resend = getResend();

  if (resend && process.env.RESEND_FROM_EMAIL && process.env.ADMIN_EMAIL) {
    try {
      const html = newSiteCreatedEmail({
        username: user.name || "User",
        siteName: name,
        siteUrl: url,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: `New Site Created - ${name}`,
        html,
      });
    } catch (err) {
      console.error("Email send failed:", {
        message: err.message,
        stack: err.stack,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: "Site created successfully",
    data: site,
  });
});