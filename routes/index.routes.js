const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route");
const paymentRouter = require("#routes/payment.route");
const siteRouter = require("#routes/site.route");
const requestRouter = require("#routes/request.route");
const statsRouter = require("#routes/stats.route");
const targetsRouter = require("#routes/targets.route");
const auditorRouter = require("#routes/auditor.route");
const aiRouter = require("#routes/ai-route");

const authMiddleware = require("#middlewares/auth.middleware");

// Public routes
router.use("/auth", authRouter);

// Protect all routes below
router.use(authMiddleware);

// Protected routes
router.use("/subscription", paymentRouter);
router.use("/sites", siteRouter);
router.use("/requests", requestRouter);
router.use("/stats", statsRouter);
router.use("/targets", targetsRouter);
router.use("/auditor", auditorRouter);
router.use("/ai", aiRouter);

module.exports = router;