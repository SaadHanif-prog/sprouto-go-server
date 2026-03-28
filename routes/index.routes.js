const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route");
const paymentRouter = require("#routes/payment.route");
const siteRouter = require("#routes/site.route");
const requestRouter = require("#routes/request.route");
const aiStatsRouter = require("#routes/ai-stats.route");

const authMiddleware = require("#middlewares/auth.middleware");

// Public routes
router.use("/auth", authRouter);

// Protect all routes below
router.use(authMiddleware);

// Protected routes
router.use("/subscription", paymentRouter);
router.use("/sites", siteRouter);
router.use("/requests", requestRouter);
router.use("/ai", aiStatsRouter);

module.exports = router;