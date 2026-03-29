const express = require("express");
const router = express.Router();

const {
  createSubscription,
  cancelSubscription,
  createBillingPortal,
  stripeWebhook,
  createAddonSubscription,
} = require("#controllers/payment.controller");

router.post("/webhook", stripeWebhook);

const authMiddleware = require("#middlewares/auth.middleware");

router.post("/create", authMiddleware, createSubscription);

router.post("/create-addon", createAddonSubscription);

router.post("/cancel", authMiddleware, cancelSubscription);

router.post("/portal", authMiddleware, createBillingPortal);

module.exports = router;
