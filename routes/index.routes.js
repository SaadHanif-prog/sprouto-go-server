const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route");
const paymentRouter = require("#routes/payment.route");
const siteRouter = require("#routes/site.route");
const requestRouter = require("#routes/request.route");
const statsRouter = require("#routes/stats.route");

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

module.exports = router;