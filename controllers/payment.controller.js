const Stripe = require("stripe");
const User = require("#models/user.model");
const asyncHandler = require("#utils/async-handler");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PRICE_MAP = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY,
    annually: process.env.STRIPE_STARTER_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY,
    annually: process.env.STRIPE_PRO_ANNUAL,
  },
};

/**
 * @desc Create Subscription (Stripe Elements flow)
 * @route POST /api/subscription/create
 */
exports.createSubscription = asyncHandler(async (req, res) => {
  const { planId, billingCycle } = req.body;

  const allowedPlans = Object.keys(PRICE_MAP);
  const allowedCycles = ["monthly", "annually"];

  if (!allowedPlans.includes(planId) || !allowedCycles.includes(billingCycle)) {
    return res.status(400).json({ message: "Invalid plan or billing cycle" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const priceId = PRICE_MAP[planId]?.[billingCycle];
  if (!priceId) {
    return res.status(400).json({
      message: `Price ID not configured for ${planId}/${billingCycle}`,
    });
  }

  /**
   * 1. Create or reuse Stripe customer
   */
  let customerId = user.subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
    });

    customerId = customer.id;

    user.subscription = {
      ...user.subscription,
      stripeCustomerId: customerId,
    };

    await user.save();
  }

  /**
   * 2. Create subscription
   */
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: "default_incomplete",
  collection_method: "charge_automatically",

  // ✅ KEEP ONLY THIS
  payment_settings: {
    save_default_payment_method: "on_subscription",
  },

  expand: ["latest_invoice.payment_intent"],
});
  /**
   * 3. Safely resolve invoice ID
   */
  const invoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

  /**
   * 4. Retrieve invoice with payment_intent expanded
   */
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ["payment_intent"],
  });

  const paymentIntent =
    typeof invoice.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(invoice.payment_intent)
      : invoice.payment_intent;

  if (!paymentIntent?.client_secret) {
    return res.status(500).json({
      message: "Failed to create payment intent",
    });
  }

  /**
   * 5. Save subscription (pending until webhook confirms)
   */
  user.subscription = {
    plan: planId,
    billingCycle,
    status: "pending",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: null,
  };

  await user.save();

  /**
   * 6. Return client secret
   */
  res.json({
    clientSecret: paymentIntent.client_secret,
  });
});

/**
 * @desc Stripe Webhook
 */
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ plan → sites mapping
  const planLimits = {
    starter: 1,
    pro: 3,
  };

  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const subscriptionId = invoice.subscription;

      const user = await User.findOne({
        "subscription.stripeCustomerId": customerId,
      });

      if (!user) break;

      const periodEnd = invoice.lines?.data?.[0]?.period?.end || null;

      user.subscription.status = "active";
      user.subscription.stripeSubscriptionId = subscriptionId;

      if (periodEnd) {
        user.subscription.currentPeriodEnd = new Date(periodEnd * 1000);
      }

      // ✅ ADD TO activePlans
      const currentPlan = user.subscription.plan;

      if (currentPlan && planLimits[currentPlan]) {
        user.activePlans.push({
          plan: currentPlan,
          sitesLimit: planLimits[currentPlan],
          expiresAt: user.subscription.currentPeriodEnd || null,
        });
      }

      await user.save();
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const user = await User.findOne({
        "subscription.stripeCustomerId": customerId,
      });

      if (!user) break;

      user.subscription.status = "inactive";

      // ❌ OPTIONAL: remove plan on failure
      user.activePlans = user.activePlans.filter(
        (p) => p.plan !== user.subscription.plan
      );

      await user.save();
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;

      const user = await User.findOne({
        "subscription.stripeSubscriptionId": sub.id,
      });

      if (!user) break;

      let status = "inactive";
      if (sub.status === "active") status = "active";
      if (sub.status === "past_due") status = "inactive";
      if (sub.status === "canceled") status = "canceled";
      if (sub.status === "unpaid") status = "inactive";

      user.subscription.status = status;

      if (sub.current_period_end) {
        user.subscription.currentPeriodEnd = new Date(
          sub.current_period_end * 1000
        );
      }

      await user.save();
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;

      const user = await User.findOne({
        "subscription.stripeSubscriptionId": sub.id,
      });

      if (!user) break;

      user.subscription.status = "canceled";

      // ❌ OPTIONAL: remove plan when canceled
      user.activePlans = user.activePlans.filter(
        (p) => p.plan !== user.subscription.plan
      );

      await user.save();
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});

/**
 * @desc Cancel Subscription
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user?.subscription?.stripeSubscriptionId) {
    return res.status(400).json({ message: "No active subscription" });
  }

  await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  user.subscription.status = "canceled";
  await user.save();

  res.json({ message: "Subscription will cancel at period end" });
});

/**
 * @desc Create Billing Portal Session
 */
exports.createBillingPortal = asyncHandler(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ message: "Customer ID required" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: process.env.CLIENT_URL,
  });

  res.json({ url: session.url });
});