const express = require("express");
const router = express.Router();

const {
  createSubscription,
  cancelSubscription,
  createBillingPortal,
  createAddonSubscription,
} = require("#controllers/payment.controller");



router.post("/create", createSubscription);

router.post("/create-addon", createAddonSubscription);

router.post("/cancel", cancelSubscription);

router.post("/portal", createBillingPortal);

module.exports = router;
