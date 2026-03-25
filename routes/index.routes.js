const express = require("express");
const router = express.Router();

const authRouter = require("#routes/auth.route")
const authMiddleware = require("#middlewares/auth.middleware")

// Routes
router.use("/auth", authRouter);

router.use(authMiddleware)
// Routes that needs authentication will come here..



module.exports = router;
