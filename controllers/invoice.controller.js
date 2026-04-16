const User = require("#models/user.model");
const asyncHandler = require("#utils/async-handler");


const PLAN_NAMES = {
  starter: "Starter Plan",
  pro: "Pro Plan",
};

const ADDON_NAMES = {
  a1: "Advanced SEO Pack",
  a2: "Enterprise Security",
  a3: "Speed Optimization",
  a4: "SproutoAI support",
  a4: "Email box",
};


exports.getMyInvoices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  const invoices = [];

  // ─── Plan entitlements ────────────────────────────────────────
  for (const ent of user.entitlements || []) {
    invoices.push({
      id: ent._id?.toString() || ent.stripeSubscriptionId,
      type: "plan",
      name: PLAN_NAMES[ent.plan] || ent.plan,
      planId: ent.plan,
      stripeSubscriptionId: ent.stripeSubscriptionId,
      expiresAt: ent.expiresAt,
      cancelAtPeriodEnd: ent.cancelAtPeriodEnd || false,
      billedTo: {
        title: user.title,
        firstname: user.firstname,
        surname: user.surname,
        email: user.email,
        company: user.company,
        address: user.address,
      },
    });
  }

  // ─── Addon entitlements ───────────────────────────────────────
  for (const ent of user.addonEntitlements || []) {
    invoices.push({
      id: ent._id?.toString() || ent.stripeSubscriptionId,
      type: "addon",
      name: ADDON_NAMES[ent.addonId] || ent.addonId,
      addonId: ent.addonId,
      stripeSubscriptionId: ent.stripeSubscriptionId,
      expiresAt: ent.expiresAt,
      cancelAtPeriodEnd: ent.cancelAtPeriodEnd || false,
      billedTo: {
        title: user.title,
        firstname: user.firstname,
        surname: user.surname,
        email: user.email,
        company: user.company,
        address: user.address,
      },
    });
  }

  // Sort newest first (by expiresAt descending as proxy for purchase date)
  invoices.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));

  res.json({ invoices });
});

// *NOTE: If you want to know the billing cycle per entitlement, add a
// `billingCycle` field to your entitlements schema in user.model.js and
// populate it in the webhook handler when the entitlement is created.
// e.g.:  user.entitlements.push({ plan, stripeSubscriptionId, expiresAt, billingCycle })