const express = require("express");
const router = express.Router();

// Controllers
const {register, login, logout, refreshAccessToken, verifyMe} = require("#controllers/auth.controller");

// Validators
const {validateLoginUser, validateRegisterUser} = require("#validators/auth.validator");

// Validation error handler
const { handleValidationErrors } = require("#utils/error-handlers");

// Auth Middleware
const authMiddleware = require("#middlewares/auth.middleware")

router.post("/signup", validateRegisterUser,handleValidationErrors, register);
router.post("/login", validateLoginUser, handleValidationErrors, login);
router.post("/logout", logout);
router.post("/refresh-access-token", refreshAccessToken);
router.get("/verify-me", authMiddleware, verifyMe )

module.exports = router;
