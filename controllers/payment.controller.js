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

// ==============================
// CREATE SUBSCRIPTION
// ==============================
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

  // 1. Create / reuse customer
  let customerId = user.subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
    });

    customerId = customer.id;

    user.subscription = {
      stripeCustomerId: customerId,
    };

    await user.save();
  }

  // 2. Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    collection_method: "charge_automatically",
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent"],
  });

  // 3. Get invoice
  const invoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

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

  // 4. Save minimal Stripe reference
  user.subscription = {
    stripeCustomerId: customerId,
  };

  await user.save();

  res.json({
    clientSecret: paymentIntent.client_secret,
  });
});

// ==============================
// STRIPE WEBHOOK
// ==============================
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    // =========================================================
    // ✅ SUBSCRIPTION UPDATED (CREATE + RENEW)
    // =========================================================
    case "customer.subscription.updated": {
      try {
        console.log("✅ subscription.updated triggered");

        const rawSub = event.data.object;

        // 🔥 ALWAYS FETCH FULL OBJECT (fixes missing fields issue)
        const sub = await stripe.subscriptions.retrieve(rawSub.id);

        const customerId = sub.customer;
        const subscriptionId = sub.id;

        console.log("customerId:", customerId);
        console.log("subscriptionId:", subscriptionId);
        console.log("status:", sub.status);

        // ✅ Only proceed if active
        if (sub.status !== "active") {
          console.log("⚠️ Subscription not active, skipping");
          break;
        }

        const user = await User.findOne({
          "subscription.stripeCustomerId": customerId,
        });

        if (!user) {
          console.log("❌ User not found");
          break;
        }

        const priceId = sub.items?.data?.[0]?.price?.id;

        console.log("🔥 priceId:", priceId);

        if (!priceId) {
          console.log("❌ No priceId found");
          break;
        }

        // ✅ map plan
        let plan = null;

        for (const key in PRICE_MAP) {
          for (const cycle in PRICE_MAP[key]) {
            if (PRICE_MAP[key][cycle] === priceId) {
              plan = key;
            }
          }
        }

        console.log("🔥 mapped plan:", plan);

        if (!plan) {
          console.log("❌ Plan not matched");
          break;
        }

        // ✅ SAFE period end (now guaranteed from retrieve)
        const periodEnd = sub.current_period_end;

        if (!periodEnd) {
          console.log("❌ Still no period end, skipping safely");
          break;
        }

        const expiryDate = new Date(periodEnd * 1000);

        // ✅ check if already exists (idempotent)
        const existing = user.entitlements.find(
          (e) => e.stripeSubscriptionId === subscriptionId,
        );

        if (existing) {
          existing.expiresAt = expiryDate;
          existing.plan = plan; // 🔁 keep plan synced
          console.log("🔄 entitlement updated");
        } else {
          user.entitlements.push({
            plan,
            stripeSubscriptionId: subscriptionId,
            expiresAt: expiryDate,
          });
          console.log("✅ entitlement created");
        }

        await user.save();
        console.log("✅ user saved");
      } catch (err) {
        console.error("🔥 FULL ERROR:", err);
      }

      break;
    }

    // =========================================================
    // ❌ PAYMENT FAILED
    // =========================================================
    case "invoice.payment_failed": {
      try {
        console.log("❌ payment_failed triggered");

        const invoice = event.data.object;
        const customerId = invoice.customer;

        const subscriptionId =
          invoice.subscription ||
          invoice.lines?.data?.[0]?.subscription ||
          null;

        console.log("subscriptionId:", subscriptionId);

        if (!subscriptionId) {
          console.log("❌ Missing subscriptionId");
          break;
        }

        const user = await User.findOne({
          "subscription.stripeCustomerId": customerId,
        });

        if (!user) {
          console.log("❌ User not found");
          break;
        }

        user.entitlements = user.entitlements.filter(
          (e) => e.stripeSubscriptionId !== subscriptionId,
        );

        await user.save();
        console.log("🗑 entitlement removed");
      } catch (err) {
        console.error("🔥 FULL ERROR:", err);
      }

      break;
    }

    // =========================================================
    // ❌ SUBSCRIPTION DELETED
    // =========================================================
    case "customer.subscription.deleted": {
      try {
        console.log("❌ subscription.deleted triggered");

        const sub = event.data.object;

        const user = await User.findOne({
          "entitlements.stripeSubscriptionId": sub.id,
        });

        if (!user) {
          console.log("❌ User not found");
          break;
        }

        user.entitlements = user.entitlements.filter(
          (e) => e.stripeSubscriptionId !== sub.id,
        );

        await user.save();
        console.log("🗑 entitlement removed");
      } catch (err) {
        console.error("🔥 FULL ERROR:", err);
      }

      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});
// ==============================
// CANCEL SUBSCRIPTION
// ==============================
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ message: "Subscription ID required" });
  }

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  res.json({ message: "Subscription will cancel at period end" });
});

// ==============================
// BILLING PORTAL
// ==============================
exports.createBillingPortal = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user?.subscription?.stripeCustomerId) {
    return res.status(400).json({ message: "No customer found" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: process.env.CLIENT_URL,
  });

  res.json({ url: session.url });
});
