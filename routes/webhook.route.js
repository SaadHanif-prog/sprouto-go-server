const express = require("express");
const router = express.Router();

const {
  stripeWebhook,
} = require("#controllers/payment.controller");

router.post("/", stripeWebhook);


module.exports = router;
