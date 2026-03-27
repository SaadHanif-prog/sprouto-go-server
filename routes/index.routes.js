const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route");
const paymentRouter = require("#routes/payment.route");
const authMiddleware = require("#middlewares/auth.middleware");

router.use("/auth", authRouter);

router.use(authMiddleware);

router.use("/subscription", paymentRouter);

module.exports = router;