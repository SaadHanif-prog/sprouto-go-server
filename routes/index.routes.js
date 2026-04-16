const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route");
const siteRouter = require("#routes/site.route");
const requestRouter = require("#routes/request.route");
const statsRouter = require("#routes/stats.route");
const targetsRouter = require("#routes/targets.route");
const auditorRouter = require("#routes/auditor.route");
const aiRouter = require("#routes/ai-route");
const sproutoAIRouter = require("#routes/sprouto-ai.route");
const googleRouter = require("#routes/stats-new.route");
const uploadAttachmentRouter = require("#routes/upload.route")
const paymentRouter = require("#routes/payment.route")
const invoiceRouter = require("#routes/invoice.route")

const authMiddleware = require("#middlewares/auth.middleware");

// ================= PUBLIC ROUTES =================
router.use("/auth", authRouter);
router.use("/google", googleRouter);


// ================= PROTECTED ROUTES =================
router.use(authMiddleware);

// Core platform
router.use("/sites", siteRouter);
router.use("/requests", requestRouter);
router.use("/stats", statsRouter);
router.use("/targets", targetsRouter);
router.use("/auditor", auditorRouter);
router.use("/ai", aiRouter);
router.use("/sproutoai", sproutoAIRouter);
router.use("/upload", uploadAttachmentRouter);
router.use("/subscription", paymentRouter);
router.use("/invoices", invoiceRouter);


module.exports = router;